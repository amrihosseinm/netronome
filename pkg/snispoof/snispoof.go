// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

// Package snispoof checks whether "SNI spoofing" (also known as domain
// fronting) is possible on the current network: connecting to a server IP
// while advertising an allowed hostname in the unencrypted TLS SNI field,
// but requesting a different (potentially blocked) hostname at the HTTP
// layer once the encrypted tunnel is established. This is a diagnostic
// technique used to detect SNI-based filtering, inspired by the "SNI Spoof
// Check" tool from the network-checker project
// (https://github.com/mirarr-app/network-checker).
package snispoof

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"time"
)

const timeout = 6 * time.Second

// Result describes the outcome of an SNI spoof check.
type Result struct {
	TargetDomain string  `json:"target_domain"`
	SpoofedSNI   string  `json:"spoofed_sni"`
	IP           string  `json:"ip"`
	Open         bool    `json:"open"`
	StatusCode   int     `json:"status_code,omitempty"`
	LatencyMs    float64 `json:"latency_ms"`
	Error        string  `json:"error,omitempty"`
}

// Check attempts to connect to ip (or, if empty, an IP resolved from
// targetDomain) using spoofedSNI as the TLS ClientHello SNI value, then
// issues an HTTP request with the Host header set to targetDomain over the
// resulting encrypted tunnel. If the server responds with a valid HTTP
// status for targetDomain, SNI-based filtering can likely be bypassed on
// this network (Open = true).
func Check(ctx context.Context, targetDomain, spoofedSNI, ip string) (*Result, error) {
	if targetDomain == "" {
		return nil, fmt.Errorf("target domain is required")
	}
	if spoofedSNI == "" {
		return nil, fmt.Errorf("spoofed SNI is required")
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	resolvedIP := ip
	if resolvedIP == "" {
		addrs, err := net.DefaultResolver.LookupHost(ctx, targetDomain)
		if err != nil || len(addrs) == 0 {
			return nil, fmt.Errorf("failed to resolve %s: %w", targetDomain, err)
		}
		resolvedIP = addrs[0]
	}

	start := time.Now()

	dialer := &net.Dialer{Timeout: timeout}
	rawConn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(resolvedIP, "443"))
	if err != nil {
		return &Result{
			TargetDomain: targetDomain,
			SpoofedSNI:   spoofedSNI,
			IP:           resolvedIP,
			Open:         false,
			Error:        "connection_failed",
		}, nil
	}

	tlsConn := tls.Client(rawConn, &tls.Config{
		ServerName:         spoofedSNI,
		InsecureSkipVerify: true,
	})
	if err := tlsConn.HandshakeContext(ctx); err != nil {
		tlsConn.Close()
		return &Result{
			TargetDomain: targetDomain,
			SpoofedSNI:   spoofedSNI,
			IP:           resolvedIP,
			Open:         false,
			Error:        "tls_handshake_failed",
		}, nil
	}
	defer tlsConn.Close()

	transport := &http.Transport{
		DialTLSContext: func(_ context.Context, _, _ string) (net.Conn, error) {
			return tlsConn, nil
		},
	}
	client := &http.Client{Transport: transport, Timeout: timeout}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://"+targetDomain+"/", nil)
	if err != nil {
		return nil, err
	}
	req.Host = targetDomain
	req.Header.Set("User-Agent", "Mozilla/5.0 netronome-sni-spoof-check")

	resp, err := client.Do(req)
	latency := float64(time.Since(start).Microseconds()) / 1000.0
	if err != nil {
		return &Result{
			TargetDomain: targetDomain,
			SpoofedSNI:   spoofedSNI,
			IP:           resolvedIP,
			Open:         false,
			LatencyMs:    latency,
			Error:        "request_failed",
		}, nil
	}
	defer resp.Body.Close()

	open := resp.StatusCode > 0 && resp.StatusCode < 500

	return &Result{
		TargetDomain: targetDomain,
		SpoofedSNI:   spoofedSNI,
		IP:           resolvedIP,
		Open:         open,
		StatusCode:   resp.StatusCode,
		LatencyMs:    latency,
	}, nil
}
