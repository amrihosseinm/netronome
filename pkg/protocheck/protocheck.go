// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

// Package protocheck tests which protocols and ports are currently reachable
// from the user's network. Results depend on the local ISP and regional
// filtering conditions, so the report also includes the detected network
// location (city/region/ISP) for context.
package protocheck

import (
	"context"
	"crypto/tls"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/quic-go/quic-go/http3"
)

const (
	testTimeout  = 6 * time.Second
	geoTimeout   = 5 * time.Second
	probeDomain  = "www.cloudflare.com"
	probeDNSName = "example.com"
)

// NetworkInfo describes the public network the checks are run from.
type NetworkInfo struct {
	IP      string `json:"ip,omitempty"`
	City    string `json:"city,omitempty"`
	Region  string `json:"region,omitempty"`
	Country string `json:"country,omitempty"`
	ISP     string `json:"isp,omitempty"`
	Source  string `json:"source,omitempty"`
}

// TestResult is the outcome of a single protocol/port probe.
type TestResult struct {
	Group     string  `json:"group"`
	Protocol  string  `json:"protocol"`
	Host      string  `json:"host"`
	Port      int     `json:"port"`
	Reachable bool    `json:"reachable"`
	LatencyMs float64 `json:"latency_ms"`
	Detail    string  `json:"detail,omitempty"`
	Error     string  `json:"error,omitempty"`
}

// Report is a full protocol reachability report.
type Report struct {
	Network    *NetworkInfo `json:"network,omitempty"`
	Timestamp  time.Time    `json:"timestamp"`
	DurationMs float64      `json:"duration_ms"`
	Results    []TestResult `json:"results"`
}

// GroupNames returns the display order of result groups.
var GroupOrder = []string{
	"web",
	"cdn_alt_tls",
	"cdn_alt_http",
	"dns",
	"quic",
	"ssh",
	"udp",
}

type testFunc func(ctx context.Context) (bool, string, error)

type testDef struct {
	group    string
	protocol string
	host     string
	port     int
	fn       testFunc
}

// detectNetwork best-effort lookup of the public IP and city/region/ISP.
// All lookups run server-side, i.e. from the same network being probed.
func detectNetwork(ctx context.Context) *NetworkInfo {
	type geoSource struct {
		name string
		url  string
	}
	sources := []geoSource{
		{"ip-api.com", "http://ip-api.com/json/?fields=status,country,regionName,city,isp,query"},
		{"ipapi.co", "https://ipapi.co/json/"},
	}

	for _, src := range sources {
		reqCtx, cancel := context.WithTimeout(ctx, geoTimeout)
		req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, src.url, nil)
		if err != nil {
			cancel()
			continue
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			cancel()
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
		resp.Body.Close()
		cancel()

		info := parseGeoJSON(body, src.name)
		if info != nil {
			return info
		}
	}
	return nil
}

func parseGeoJSON(body []byte, source string) *NetworkInfo {
	// Minimal JSON field extraction without pulling a JSON dependency into
	// the hot path; values are simple strings from known APIs.
	get := func(key string) string {
		needle := "\"" + key + "\":"
		idx := strings.Index(string(body), needle)
		if idx < 0 {
			return ""
		}
		rest := string(body)[idx+len(needle):]
		start := strings.Index(rest, "\"")
		if start < 0 {
			return ""
		}
		rest = rest[start+1:]
		end := strings.Index(rest, "\"")
		if end < 0 {
			return ""
		}
		return rest[:end]
	}

	ip := get("query")
	if ip == "" {
		ip = get("ip")
	}
	if ip == "" {
		return nil
	}
	return &NetworkInfo{
		IP:      ip,
		City:    get("city"),
		Region:  get("regionName") + get("region"),
		Country: get("country"),
		ISP:     get("isp"),
		Source:  source,
	}
}

// tcpConnect measures a plain TCP connection to host:port.
func tcpConnect(host string, port int) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		d := net.Dialer{}
		conn, err := d.DialContext(ctx, "tcp", net.JoinHostPort(host, fmt.Sprintf("%d", port)))
		if err != nil {
			return false, "", err
		}
		conn.Close()
		return true, "TCP connect OK", nil
	}
}

// tlsHandshake performs a real TLS handshake and reports the negotiated version.
func tlsHandshake(host string, port int) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		d := net.Dialer{}
		raw, err := d.DialContext(ctx, "tcp", net.JoinHostPort(host, fmt.Sprintf("%d", port)))
		if err != nil {
			return false, "", err
		}
		defer raw.Close()
		if dl, ok := ctx.Deadline(); ok {
			raw.SetDeadline(dl)
		}
		conn := tls.Client(raw, &tls.Config{
			ServerName:         host,
			MinVersion:         tls.VersionTLS12,
			ClientSessionCache: tls.NewLRUClientSessionCache(0),
		})
		if err := conn.HandshakeContext(ctx); err != nil {
			return false, "", err
		}
		state := conn.ConnectionState()
		version := "TLS 1.3"
		switch state.Version {
		case tls.VersionTLS10:
			version = "TLS 1.0"
		case tls.VersionTLS11:
			version = "TLS 1.1"
		case tls.VersionTLS12:
			version = "TLS 1.2"
		}
		conn.Close()
		return true, fmt.Sprintf("handshake OK (%s)", version), nil
	}
}

// buildDNSQuery creates a minimal A-record query for probeDNSName.
func buildDNSQuery() []byte {
	q := []byte{0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}
	for _, label := range strings.Split(probeDNSName, ".") {
		q = append(q, byte(len(label)))
		q = append(q, label...)
	}
	q = append(q, 0, 0, 1, 0, 1)
	return q
}

func validDNSResponse(buf []byte) bool {
	return len(buf) >= 12 &&
		buf[0] == 0x12 && buf[1] == 0x34 &&
		buf[2]&0x80 != 0 && // QR: response
		buf[3]&0x0F == 0 // RCODE: NOERROR
}

// dnsUDP resolves probeDNSName over plain UDP DNS.
func dnsUDP(server string) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		var d net.Dialer
		conn, err := d.DialContext(ctx, "udp", net.JoinHostPort(server, "53"))
		if err != nil {
			return false, "", err
		}
		defer conn.Close()
		if dl, ok := ctx.Deadline(); ok {
			conn.SetDeadline(dl)
		}
		if _, err := conn.Write(buildDNSQuery()); err != nil {
			return false, "", err
		}
		buf := make([]byte, 512)
		n, err := conn.Read(buf)
		if err != nil {
			return false, "", err
		}
		if !validDNSResponse(buf[:n]) {
			return false, "", errors.New("invalid DNS response")
		}
		return true, fmt.Sprintf("resolved %s via %s", probeDNSName, server), nil
	}
}

// dnsTCP resolves probeDNSName over TCP DNS (length-prefixed wire format).
func dnsTCP(server string) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		var d net.Dialer
		conn, err := d.DialContext(ctx, "tcp", net.JoinHostPort(server, "53"))
		if err != nil {
			return false, "", err
		}
		defer conn.Close()
		if dl, ok := ctx.Deadline(); ok {
			conn.SetDeadline(dl)
		}
		query := buildDNSQuery()
		msg := make([]byte, 2+len(query))
		binary.BigEndian.PutUint16(msg, uint16(len(query)))
		copy(msg[2:], query)
		if _, err := conn.Write(msg); err != nil {
			return false, "", err
		}
		head := make([]byte, 2)
		if _, err := io.ReadFull(conn, head); err != nil {
			return false, "", err
		}
		resp := make([]byte, binary.BigEndian.Uint16(head))
		if _, err := io.ReadFull(conn, resp); err != nil {
			return false, "", err
		}
		if !validDNSResponse(resp) {
			return false, "", errors.New("invalid DNS response")
		}
		return true, fmt.Sprintf("resolved %s via %s (TCP)", probeDNSName, server), nil
	}
}

// dnsOverTLS checks DNS-over-TLS on port 853.
func dnsOverTLS(server string) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		d := net.Dialer{}
		raw, err := d.DialContext(ctx, "tcp", net.JoinHostPort(server, "853"))
		if err != nil {
			return false, "", err
		}
		defer raw.Close()
		if dl, ok := ctx.Deadline(); ok {
			raw.SetDeadline(dl)
		}
		conn := tls.Client(raw, &tls.Config{ServerName: server})
		if err := conn.HandshakeContext(ctx); err != nil {
			return false, "", err
		}
		query := buildDNSQuery()
		msg := make([]byte, 2+len(query))
		binary.BigEndian.PutUint16(msg, uint16(len(query)))
		copy(msg[2:], query)
		if _, err := conn.Write(msg); err != nil {
			return false, "", err
		}
		head := make([]byte, 2)
		if _, err := io.ReadFull(conn, head); err != nil {
			return false, "", err
		}
		resp := make([]byte, binary.BigEndian.Uint16(head))
		if _, err := io.ReadFull(conn, resp); err != nil {
			return false, "", err
		}
		if !validDNSResponse(resp) {
			return false, "", errors.New("invalid DNS response")
		}
		return true, "DoT query OK", nil
	}
}

// httpsGet performs a real HTTPS request (full TLS + HTTP stack).
// accept optionally sets the Accept header (DoH JSON APIs require it).
func httpsGet(url string, accept string) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return false, "", err
		}
		if accept != "" {
			req.Header.Set("Accept", accept)
		}
		client := &http.Client{
			Timeout: testTimeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}
		resp, err := client.Do(req)
		if err != nil {
			return false, "", err
		}
		defer resp.Body.Close()
		io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		if resp.StatusCode >= 500 {
			return false, "", fmt.Errorf("HTTP %d", resp.StatusCode)
		}
		return true, fmt.Sprintf("HTTP %d", resp.StatusCode), nil
	}
}

// h3Request performs an HTTP/3 (QUIC over UDP) request, proving outbound
// UDP/443 plus QUIC viability.
func h3Request(url string) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		tr := &http3.Transport{
			TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12},
		}
		defer tr.Close()

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return false, "", err
		}
		resp, err := tr.RoundTrip(req)
		if err != nil {
			return false, "", err
		}
		defer resp.Body.Close()
		io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return true, fmt.Sprintf("HTTP/3 %d", resp.StatusCode), nil
	}
}

// sshBanner opens an SSH connection and reads the server banner.
func sshBanner(host string) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		var d net.Dialer
		conn, err := d.DialContext(ctx, "tcp", net.JoinHostPort(host, "22"))
		if err != nil {
			return false, "", err
		}
		defer conn.Close()
		if dl, ok := ctx.Deadline(); ok {
			conn.SetDeadline(dl)
		}
		buf := make([]byte, 256)
		n, err := conn.Read(buf)
		if err != nil && n == 0 {
			return false, "", err
		}
		banner := strings.TrimSpace(string(buf[:n]))
		if !strings.HasPrefix(banner, "SSH-") {
			return false, "", errors.New("no SSH banner received")
		}
		return true, banner, nil
	}
}

// ntpQuery sends an NTP client packet and validates the server response,
// proving outbound UDP/123.
func ntpQuery(server string) testFunc {
	return func(ctx context.Context) (bool, string, error) {
		var d net.Dialer
		conn, err := d.DialContext(ctx, "udp", net.JoinHostPort(server, "123"))
		if err != nil {
			return false, "", err
		}
		defer conn.Close()
		if dl, ok := ctx.Deadline(); ok {
			conn.SetDeadline(dl)
		}
		packet := make([]byte, 48)
		packet[0] = 0x1B // LI=0, VN=3, Mode=3 (client)
		if _, err := conn.Write(packet); err != nil {
			return false, "", err
		}
		resp := make([]byte, 48)
		if _, err := io.ReadFull(conn, resp); err != nil {
			return false, "", err
		}
		mode := resp[0] & 0x07
		if mode != 4 { // 4 = server
			return false, "", errors.New("invalid NTP response")
		}
		return true, "NTP response OK", nil
	}
}

func defaultTests() []testDef {
	tests := []testDef{
		// Baseline web
		{group: "web", protocol: "HTTP", host: probeDomain, port: 80, fn: httpsGet("http://"+probeDomain+"/", "")},
		{group: "web", protocol: "HTTPS", host: probeDomain, port: 443, fn: httpsGet("https://"+probeDomain+"/", "")},

		// SSH
		{group: "ssh", protocol: "SSH", host: "github.com", port: 22, fn: sshBanner("github.com")},
	}

	// Cloudflare alternative TLS ports (commonly used by TLS-based proxies
	// behind the CDN).
	for _, port := range []int{2053, 2083, 2087, 2096, 8443, 8883} {
		tests = append(tests, testDef{
			group: "cdn_alt_tls", protocol: "TLS", host: probeDomain, port: port,
			fn: tlsHandshake(probeDomain, port),
		})
	}

	// Cloudflare alternative plain-HTTP ports.
	for _, port := range []int{8080, 2052, 2082, 2086, 2095} {
		tests = append(tests, testDef{
			group: "cdn_alt_http", protocol: "TCP", host: probeDomain, port: port,
			fn: tcpConnect(probeDomain, port),
		})
	}

	// DNS family
	tests = append(tests,
		testDef{group: "dns", protocol: "DNS/UDP", host: "1.1.1.1", port: 53, fn: dnsUDP("1.1.1.1")},
		testDef{group: "dns", protocol: "DNS/UDP", host: "8.8.8.8", port: 53, fn: dnsUDP("8.8.8.8")},
		testDef{group: "dns", protocol: "DNS/TCP", host: "1.1.1.1", port: 53, fn: dnsTCP("1.1.1.1")},
		testDef{group: "dns", protocol: "DoT", host: "1.1.1.1", port: 853, fn: dnsOverTLS("1.1.1.1")},
		testDef{group: "dns", protocol: "DoH", host: "cloudflare-dns.com", port: 443, fn: httpsGet("https://cloudflare-dns.com/dns-query?name="+probeDNSName+"&type=A", "application/dns-json")},
		testDef{group: "dns", protocol: "DoH", host: "dns.google", port: 443, fn: httpsGet("https://dns.google/resolve?name="+probeDNSName, "application/dns-json")},
	)

	// QUIC / HTTP-3 (UDP 443)
	tests = append(tests,
		testDef{group: "quic", protocol: "HTTP/3", host: probeDomain, port: 443, fn: h3Request("https://" + probeDomain + "/")},
		testDef{group: "quic", protocol: "DoH3", host: "cloudflare-dns.com", port: 443, fn: h3Request("https://cloudflare-dns.com/dns-query?name=" + probeDNSName + "&type=A")},
	)

	// Other UDP services
	tests = append(tests,
		testDef{group: "udp", protocol: "NTP", host: "time.cloudflare.com", port: 123, fn: ntpQuery("time.cloudflare.com")},
	)

	return tests
}

// Run executes all protocol probes concurrently and returns a report.
func Run(ctx context.Context) *Report {
	start := time.Now()

	var wg sync.WaitGroup
	tests := defaultTests()
	results := make([]TestResult, len(tests))

	for i, td := range tests {
		wg.Add(1)
		go func(i int, td testDef) {
			defer wg.Done()
			testCtx, cancel := context.WithTimeout(ctx, testTimeout)
			defer cancel()

			t0 := time.Now()
			ok, detail, err := td.fn(testCtx)
			elapsed := float64(time.Since(t0).Microseconds()) / 1000.0

			r := TestResult{
				Group:     td.group,
				Protocol:  td.protocol,
				Host:      td.host,
				Port:      td.port,
				Reachable: ok,
				LatencyMs: elapsed,
				Detail:    detail,
			}
			if err != nil {
				r.Error = err.Error()
			}
			results[i] = r
		}(i, td)
	}

	wg.Wait()

	network := detectNetwork(ctx)

	orderIdx := func(g string) int {
		for i, name := range GroupOrder {
			if name == g {
				return i
			}
		}
		return len(GroupOrder)
	}
	stableSortByGroup(results, orderIdx)

	return &Report{
		Network:    network,
		Timestamp:  time.Now().UTC(),
		DurationMs: float64(time.Since(start).Milliseconds()),
		Results:    results,
	}
}

func stableSortByGroup(results []TestResult, orderIdx func(string) int) {
	for i := 1; i < len(results); i++ {
		for j := i; j > 0 && orderIdx(results[j-1].Group) > orderIdx(results[j].Group); j-- {
			results[j-1], results[j] = results[j], results[j-1]
		}
	}
}
