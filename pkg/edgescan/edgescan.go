// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

// Package edgescan scans ranges of IP addresses to find ones that respond
// correctly for a given CDN/edge hostname (SNI). It is inspired by the
// "Edge IP Checker" / "Akamai Scanner" tools from the network-checker
// project (https://github.com/mirarr-app/network-checker), which help users
// in Iran find clean, unfiltered IPs for CDNs such as Cloudflare.
package edgescan

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// CloudflareRanges are the official Cloudflare IPv4 CIDR ranges.
// Source: https://www.cloudflare.com/ips-v4
var CloudflareRanges = []string{
	"173.245.48.0/20",
	"103.21.244.0/22",
	"103.22.200.0/22",
	"103.31.4.0/22",
	"141.101.64.0/18",
	"108.162.192.0/18",
	"190.93.240.0/20",
	"188.114.96.0/20",
	"197.234.240.0/22",
	"198.41.128.0/17",
	"162.158.0.0/15",
	"104.16.0.0/13",
	"104.24.0.0/14",
	"172.64.0.0/13",
	"131.0.72.0/22",
}

const (
	dialTimeout    = 3 * time.Second
	maxIPsPerScan  = 4096
	defaultWorkers = 50
	maxWorkers     = 300
)

// IPResult describes the result of probing a single IP address.
type IPResult struct {
	IP         string  `json:"ip"`
	Success    bool    `json:"success"`
	LatencyMs  float64 `json:"latency_ms"`
	StatusCode int     `json:"status_code,omitempty"`
	Error      string  `json:"error,omitempty"`
}

// Status represents the current state of a running (or finished) scan.
type Status struct {
	Running   bool       `json:"running"`
	SNI       string     `json:"sni"`
	Total     int        `json:"total"`
	Scanned   int        `json:"scanned"`
	Found     int        `json:"found"`
	Results   []IPResult `json:"results"`
	Error     string     `json:"error,omitempty"`
	StartedAt int64      `json:"started_at"`
}

type session struct {
	mu      sync.RWMutex
	sni     string
	host    string
	running bool
	cancel  context.CancelFunc
	total   int
	scanned int
	results []IPResult
	lastErr string
	started int64
}

var (
	globalSession *session
	sessionMu     sync.Mutex
)

// ExpandTargets converts a list of raw entries (single IPs or CIDR ranges)
// into a flat, de-duplicated list of IP addresses. The result is capped at
// maxIPsPerScan entries to keep scans bounded.
func ExpandTargets(entries []string) ([]string, error) {
	seen := make(map[string]struct{})
	var ips []string

	for _, raw := range entries {
		entry := strings.TrimSpace(raw)
		if entry == "" {
			continue
		}

		if strings.Contains(entry, "/") {
			expanded, err := expandCIDR(entry)
			if err != nil {
				return nil, fmt.Errorf("invalid range %q: %w", entry, err)
			}
			for _, ip := range expanded {
				if _, ok := seen[ip]; !ok {
					seen[ip] = struct{}{}
					ips = append(ips, ip)
					if len(ips) >= maxIPsPerScan {
						return ips, nil
					}
				}
			}
			continue
		}

		ip := net.ParseIP(entry)
		if ip == nil {
			return nil, fmt.Errorf("invalid IP address %q", entry)
		}
		if _, ok := seen[entry]; !ok {
			seen[entry] = struct{}{}
			ips = append(ips, entry)
			if len(ips) >= maxIPsPerScan {
				return ips, nil
			}
		}
	}

	return ips, nil
}

func expandCIDR(cidr string) ([]string, error) {
	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, err
	}

	// Only support IPv4 ranges for now.
	ip4 := ip.To4()
	if ip4 == nil {
		return nil, fmt.Errorf("only IPv4 ranges are supported")
	}

	ones, bits := ipNet.Mask.Size()
	hostBits := bits - ones
	if hostBits > 20 { // cap at /12 (~1M) to avoid pathological input; further capped by maxIPsPerScan anyway
		hostBits = 20
	}

	var ips []string
	for cur := cloneIP(ipNet.IP); ipNet.Contains(cur) && len(ips) < maxIPsPerScan; incIP(cur) {
		ips = append(ips, cur.String())
	}

	return ips, nil
}

func cloneIP(ip net.IP) net.IP {
	dup := make(net.IP, len(ip))
	copy(dup, ip)
	return dup
}

func incIP(ip net.IP) {
	for i := len(ip) - 1; i >= 0; i-- {
		ip[i]++
		if ip[i] != 0 {
			break
		}
	}
}

// Start begins an asynchronous scan of the given IP/CIDR entries against the
// given SNI/hostname. path is the HTTP path used to validate a response
// (defaults to "/" when empty). workers controls scan concurrency.
func Start(sni string, entries []string, workers int) error {
	sessionMu.Lock()
	defer sessionMu.Unlock()

	if globalSession != nil && globalSession.running {
		globalSession.stop()
	}

	if sni == "" {
		return fmt.Errorf("sni/hostname is required")
	}

	targets, err := ExpandTargets(entries)
	if err != nil {
		return err
	}
	if len(targets) == 0 {
		return fmt.Errorf("no valid IP addresses or ranges provided")
	}

	if workers <= 0 {
		workers = defaultWorkers
	}
	if workers > maxWorkers {
		workers = maxWorkers
	}

	ctx, cancel := context.WithCancel(context.Background())
	s := &session{
		sni:     sni,
		running: true,
		cancel:  cancel,
		total:   len(targets),
		started: time.Now().UnixMilli(),
	}
	globalSession = s

	go s.run(ctx, targets, workers)

	return nil
}

// Stop cancels the current scan session, if any.
func Stop() {
	sessionMu.Lock()
	defer sessionMu.Unlock()
	if globalSession != nil {
		globalSession.stop()
	}
}

// GetStatus returns a snapshot of the current scan session.
func GetStatus() Status {
	sessionMu.Lock()
	s := globalSession
	sessionMu.Unlock()

	if s == nil {
		return Status{Running: false}
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	results := make([]IPResult, len(s.results))
	copy(results, s.results)
	sort.Slice(results, func(i, j int) bool {
		if results[i].Success != results[j].Success {
			return results[i].Success
		}
		return results[i].LatencyMs < results[j].LatencyMs
	})

	found := 0
	for _, r := range results {
		if r.Success {
			found++
		}
	}

	return Status{
		Running:   s.running,
		SNI:       s.sni,
		Total:     s.total,
		Scanned:   s.scanned,
		Found:     found,
		Results:   results,
		Error:     s.lastErr,
		StartedAt: s.started,
	}
}

func (s *session) stop() {
	if s.cancel != nil {
		s.cancel()
	}
	s.mu.Lock()
	s.running = false
	s.mu.Unlock()
}

func (s *session) run(ctx context.Context, targets []string, workers int) {
	defer func() {
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
	}()

	jobs := make(chan string)
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for ip := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
				}
				result := probeIP(ctx, ip, s.sni)
				s.mu.Lock()
				s.results = append(s.results, result)
				s.scanned++
				s.mu.Unlock()
			}
		}()
	}

	for _, ip := range targets {
		select {
		case <-ctx.Done():
			close(jobs)
			wg.Wait()
			return
		case jobs <- ip:
		}
	}
	close(jobs)
	wg.Wait()
}

func probeIP(ctx context.Context, ip string, sni string) IPResult {
	start := time.Now()

	dialer := &net.Dialer{Timeout: dialTimeout}
	tlsConn, err := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(ip, "443"), &tls.Config{
		ServerName:         sni,
		InsecureSkipVerify: true,
	})
	if err != nil {
		return IPResult{IP: ip, Success: false, Error: classifyDialError(err)}
	}
	defer tlsConn.Close()

	transport := &http.Transport{
		DialTLSContext: func(_ context.Context, _, _ string) (net.Conn, error) {
			return tlsConn, nil
		},
	}
	client := &http.Client{Transport: transport, Timeout: dialTimeout}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://"+sni+"/", nil)
	if err != nil {
		return IPResult{IP: ip, Success: false, Error: err.Error()}
	}
	req.Host = sni
	req.Header.Set("User-Agent", "Mozilla/5.0 netronome-edge-scanner")

	resp, err := client.Do(req)
	latency := float64(time.Since(start).Microseconds()) / 1000.0
	if err != nil {
		return IPResult{IP: ip, Success: false, LatencyMs: latency, Error: classifyDialError(err)}
	}
	defer resp.Body.Close()

	success := resp.StatusCode > 0 && resp.StatusCode < 500

	return IPResult{
		IP:         ip,
		Success:    success,
		LatencyMs:  latency,
		StatusCode: resp.StatusCode,
	}
}

func classifyDialError(err error) string {
	if err == nil {
		return ""
	}
	if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
		return "timeout"
	}
	return "unreachable"
}
