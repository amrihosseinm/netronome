// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package dnsbench

import (
	"context"
	"fmt"
	"os/exec"

	"net"
	"sort"
	"sync"
	"time"
)

type Resolver struct {
	Name        string `json:"name"`
	IP          string `json:"ip"`
	SecondaryIP string `json:"secondary_ip,omitempty"`
}

type BenchmarkResult struct {
	Resolver    Resolver `json:"resolver"`
	LatencyMs   float64  `json:"latency_ms"`
	SuccessRate float64  `json:"success_rate"` // 0.0 to 100.0
	Status      string   `json:"status"`       // "Recommended", "Good", "Slow", "Timeout"
}

var DefaultResolvers = []Resolver{
	{Name: "Cloudflare", IP: "1.1.1.1", SecondaryIP: "1.0.0.1"},
	{Name: "Google", IP: "8.8.8.8", SecondaryIP: "8.8.4.4"},
	{Name: "Shecan", IP: "178.22.122.100", SecondaryIP: "185.51.200.2"},
	{Name: "Electro", IP: "78.157.42.100", SecondaryIP: "78.157.42.101"},
	{Name: "403 Online", IP: "10.202.10.202", SecondaryIP: "10.202.10.102"},
	{Name: "Begzar", IP: "185.55.226.26", SecondaryIP: "185.55.225.25"},
	{Name: "Quad9", IP: "9.9.9.9", SecondaryIP: "149.112.112.112"},
	{Name: "OpenDNS", IP: "208.67.222.222", SecondaryIP: "208.67.220.220"},
}

var DefaultDomains = []string{
	"google.com",
	"github.com",
	"docker.com",
	"apple.com",
	"cloudflare.com",
}

const timeout = 2 * time.Second

func benchmarkResolver(resolver Resolver, domains []string) BenchmarkResult {
	if len(domains) == 0 {
		return BenchmarkResult{Resolver: resolver, LatencyMs: 0, SuccessRate: 0, Status: "No domains"}
	}

	var totalLatency time.Duration
	successCount := 0

	// Use custom resolver logic via net.Resolver
	r := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{
				Timeout: timeout,
			}
			return d.DialContext(ctx, "udp", resolver.IP+":53")
		},
	}

	for _, domain := range domains {
		start := time.Now()
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		_, err := r.LookupHost(ctx, domain)
		cancel()
		
		duration := time.Since(start)

		if err == nil {
			successCount++
			totalLatency += duration
		} else {
			// On error (like timeout), add max timeout duration for latency penalty
			totalLatency += timeout
		}
	}

	avgLatencyMs := float64(totalLatency.Milliseconds()) / float64(len(domains))
	successRate := (float64(successCount) / float64(len(domains))) * 100.0

	status := "Timeout"
	if successRate > 0 {
		if avgLatencyMs < 50 {
			status = "Recommended"
		} else if avgLatencyMs < 150 {
			status = "Good"
		} else {
			status = "Slow"
		}
	}

	return BenchmarkResult{
		Resolver:    resolver,
		LatencyMs:   avgLatencyMs,
		SuccessRate: successRate,
		Status:      status,
	}
}

// RunBenchmark runs a concurrent DNS benchmark for all specified resolvers using given test domains
func RunBenchmark(resolvers []Resolver, domains []string) []BenchmarkResult {
	if resolvers == nil {
		resolvers = DefaultResolvers
	}
	if domains == nil {
		domains = DefaultDomains
	}

	results := make([]BenchmarkResult, len(resolvers))
	var wg sync.WaitGroup

	for i, res := range resolvers {
		wg.Add(1)
		go func(index int, resolver Resolver) {
			defer wg.Done()
			results[index] = benchmarkResolver(resolver, domains)
		}(i, res)
	}

	wg.Wait()

	// Sort results: highest success rate first, then lowest latency
	sort.Slice(results, func(i, j int) bool {
		if results[i].SuccessRate == results[j].SuccessRate {
			return results[i].LatencyMs < results[j].LatencyMs
		}
		return results[i].SuccessRate > results[j].SuccessRate
	})

	return results
}
// SetWindowsDNS updates the active network adapter's DNS via PowerShell.
// It sets the primary (preferred) DNS and, when provided, the secondary (alternate) DNS.
func SetWindowsDNS(primaryIP, secondaryIP string) error {
	// First get the active connection name
	getAdapterCmd := `Get-NetAdapter | Where-Object {$_.Status -eq 'Up' -and $_.MacAddress -ne $null} | Select-Object -ExpandProperty Name -First 1`
	out, err := exec.Command("powershell", "-NoProfile", "-Command", getAdapterCmd).Output()
	if err != nil {
		return fmt.Errorf("failed to get active network adapter: %w", err)
	}
	
	adapterName := string(out)
	// clean up newline/spaces
	adapterName = fmt.Sprintf("%s", adapterName[:len(adapterName)-2]) 

	if adapterName == "" {
		return fmt.Errorf("no active network adapter found")
	}

	addresses := fmt.Sprintf(`"%s"`, primaryIP)
	if secondaryIP != "" {
		addresses = fmt.Sprintf(`"%s", "%s"`, primaryIP, secondaryIP)
	}

	setDnsCmd := fmt.Sprintf(`Set-DnsClientServerAddress -InterfaceAlias "%s" -ServerAddresses (%s)`, adapterName, addresses)
	err = exec.Command("powershell", "-NoProfile", "-Command", setDnsCmd).Run()
	if err != nil {
		return fmt.Errorf("failed to set DNS (Make sure the application is running as Administrator): %w", err)
	}

	return nil
}

