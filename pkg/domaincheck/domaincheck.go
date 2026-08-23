// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

// Package domaincheck scans a list of domains to determine whether they are
// currently reachable. It is inspired by the "Domain Checker" tool from the
// network-checker project (https://github.com/mirarr-app/network-checker),
// which is aimed at helping users in Iran figure out which popular websites
// are accessible from their current network.
package domaincheck

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"sort"
	"sync"
	"time"
)

// Result describes the outcome of checking a single domain.
type Result struct {
	Domain     string  `json:"domain"`
	Accessible bool    `json:"accessible"`
	StatusCode int     `json:"status_code,omitempty"`
	LatencyMs  float64 `json:"latency_ms"`
	Error      string  `json:"error,omitempty"`
}

// DefaultDomains is a curated list of popular, globally relevant domains.
// It roughly mirrors the "most visited domains" list used by network-checker.
var DefaultDomains = []string{
	"google.com",
	"youtube.com",
	"whatsapp.com",
	"telegram.org",
	"web.telegram.org",
	"instagram.com",
	"facebook.com",
	"x.com",
	"twitter.com",
	"wikipedia.org",
	"github.com",
	"discord.com",
	"signal.org",
	"netflix.com",
	"spotify.com",
	"linkedin.com",
	"tiktok.com",
	"reddit.com",
	"amazon.com",
	"microsoft.com",
	"apple.com",
	"cloudflare.com",
	"openai.com",
	"chatgpt.com",
	"steampowered.com",
	"epicgames.com",
	"protonmail.com",
	"dropbox.com",
	"twitch.tv",
	"pinterest.com",
}

const (
	timeout        = 6 * time.Second
	maxConcurrency = 15
)

func newClient() *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			DialContext: (&net.Dialer{
				Timeout: timeout,
			}).DialContext,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
}

func checkDomain(ctx context.Context, client *http.Client, domain string) Result {
	start := time.Now()

	url := "https://" + domain

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Result{Domain: domain, Accessible: false, Error: err.Error()}
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) netronome-domain-checker")

	resp, err := client.Do(req)
	latency := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		return Result{
			Domain:     domain,
			Accessible: false,
			LatencyMs:  latency,
			Error:      classifyError(err),
		}
	}
	defer resp.Body.Close()

	accessible := resp.StatusCode > 0 && resp.StatusCode < 500

	return Result{
		Domain:     domain,
		Accessible: accessible,
		StatusCode: resp.StatusCode,
		LatencyMs:  latency,
	}
}

func classifyError(err error) string {
	if err == nil {
		return ""
	}
	if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
		return "timeout"
	}
	return "connection_failed"
}

// CheckDomains concurrently checks the accessibility of the given domains.
// If domains is empty, DefaultDomains is used. Results are sorted
// alphabetically by domain name.
func CheckDomains(domains []string) []Result {
	if len(domains) == 0 {
		domains = DefaultDomains
	}

	client := newClient()
	results := make([]Result, len(domains))

	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup

	for i, domain := range domains {
		wg.Add(1)
		sem <- struct{}{}
		go func(index int, d string) {
			defer wg.Done()
			defer func() { <-sem }()

			ctx, cancel := context.WithTimeout(context.Background(), timeout)
			defer cancel()

			results[index] = checkDomain(ctx, client, d)
		}(i, domain)
	}

	wg.Wait()

	sort.Slice(results, func(i, j int) bool {
		return results[i].Domain < results[j].Domain
	})

	return results
}
