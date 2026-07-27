// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package dnsbench

import (
	"context"
	"net"
	"sort"
	"sync"
	"time"
)

type Resolver struct {
	Name string `json:"name"`
	IP   string `json:"ip"`
}

type BenchmarkResult struct {
	Resolver    Resolver `json:"resolver"`
	LatencyMs   float64  `json:"latency_ms"`
	SuccessRate float64  `json:"success_rate"` // 0.0 to 100.0
	Status      string   `json:"status"`       // "Recommended", "Good", "Slow", "Timeout"
}

var DefaultResolvers = []Resolver{
	{Name: "Cloudflare", IP: "1.1.1.1"},
	{Name: "Google", IP: "8.8.8.8"},
	{Name: "Shecan", IP: "178.22.122.100"},
	{Name: "Electro", IP: "78.157.42.100"},
	{Name: "Radar", IP: "10.202.10.202"},
	{Name: "Quad9", IP: "9.9.9.9"},
	{Name: "OpenDNS", IP: "208.67.222.222"},
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