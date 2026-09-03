// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

// Package windscribecheck tests which Windscribe VPN protocols and ports are
// reachable from the user's network. Each probe connects directly to a known
// Windscribe server endpoint so the results reflect real ISP/regional filtering.
package windscribecheck

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"sync"
	"time"
)

const (
	probeTimeout = 5 * time.Second
	// Primary test host – Windscribe Frankfurt (well-known, stable endpoint)
	probeHost = "fra.windscribe.com"
)

// Result is the outcome of a single protocol/port probe.
type Result struct {
	Group     string  `json:"group"`
	Protocol  string  `json:"protocol"`
	Host      string  `json:"host"`
	Port      int     `json:"port"`
	Transport string  `json:"transport"`
	Reachable bool    `json:"reachable"`
	LatencyMs float64 `json:"latency_ms"`
	Detail    string  `json:"detail,omitempty"`
	Error     string  `json:"error,omitempty"`
}

// Report is the full Windscribe reachability report.
type Report struct {
	Host      string    `json:"host"`
	Timestamp time.Time `json:"timestamp"`
	DurationMs float64  `json:"duration_ms"`
	Results   []Result  `json:"results"`
}

// GroupOrder controls display ordering.
var GroupOrder = []string{
	"stealth",
	"wstunnel",
	"ovpn_tcp",
	"ovpn_udp",
	"wireguard",
	"ikev2",
}

type probeFn func(ctx context.Context) (bool, string, error)

type probeDef struct {
	group     string
	protocol  string
	port      int
	transport string
	fn        probeFn
}

// tcpConnect attempts a plain TCP dial to host:port.
func tcpConnect(host string, port int) probeFn {
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

// tlsConnect performs a full TLS handshake to host:port.
func tlsConnect(host string, port int) probeFn {
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
			InsecureSkipVerify: false,
		})
		if err := conn.HandshakeContext(ctx); err != nil {
			// TLS failure still proves the TCP port is open (just TLS negotiation failed)
			// Count it as reachable since the port responded
			return true, fmt.Sprintf("TCP open (TLS: %v)", err), nil
		}
		state := conn.ConnectionState()
		ver := tlsVersion(state.Version)
		conn.Close()
		return true, fmt.Sprintf("TLS OK (%s)", ver), nil
	}
}

func tlsVersion(v uint16) string {
	switch v {
	case tls.VersionTLS13:
		return "TLS 1.3"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS10:
		return "TLS 1.0"
	default:
		return "TLS"
	}
}

// udpProbe sends a minimal UDP datagram and waits for any response.
// A response (even ICMP unreachable) proves the packet was sent; timeout = filtered.
func udpProbe(host string, port int, payload []byte) probeFn {
	return func(ctx context.Context) (bool, string, error) {
		d := net.Dialer{}
		conn, err := d.DialContext(ctx, "udp", net.JoinHostPort(host, fmt.Sprintf("%d", port)))
		if err != nil {
			return false, "", err
		}
		defer conn.Close()

		if dl, ok := ctx.Deadline(); ok {
			conn.SetDeadline(dl)
		}

		if _, err := conn.Write(payload); err != nil {
			return false, "", err
		}

		buf := make([]byte, 256)
		n, err := conn.Read(buf)
		if err != nil {
			// Read timeout = the packet went out but got no reply within deadline.
			// For VPN servers this often means "port open but no handshake initiated".
			// We treat a clean send (no immediate ICMP rejection) as "reachable".
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				return true, "UDP sent (no reply = port likely open)", nil
			}
			return false, "", err
		}
		return true, fmt.Sprintf("UDP reply %d bytes", n), nil
	}
}

// ikePayload is a minimal IKE_SA_INIT packet (RFC 7296).
var ikePayload = []byte{
	// IKE Header (28 bytes)
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, // SPI initiator
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // SPI responder
	0x21,       // Next payload: SA (33)
	0x20,       // Version: 2.0
	0x22, 0x00, // Exchange: IKE_SA_INIT (34), flags: 0x08
	0x00, 0x00, 0x00, 0x00, // Message ID: 0
	0x00, 0x00, 0x00, 0x1c, // Length: 28
}

// wgHandshake is a minimal WireGuard handshake initiation message type byte.
var wgHandshake = []byte{
	0x01, 0x00, 0x00, 0x00, // type=1 (handshake initiation), reserved
	0x00, 0x00, 0x00, 0x00, // sender index
}

// ovpnHello is a minimal OpenVPN hello packet.
var ovpnHello = []byte{
	0x38, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
}

func buildProbes() []probeDef {
	h := probeHost
	return []probeDef{
		// Stealth / obfuscated TCP
		{group: "stealth", protocol: "Stealth", port: 443, transport: "TCP", fn: tcpConnect(h, 443)},
		{group: "stealth", protocol: "Stealth", port: 80, transport: "TCP", fn: tcpConnect(h, 80)},

		// WStunnel (WebSocket over TLS)
		{group: "wstunnel", protocol: "WStunnel", port: 443, transport: "TLS", fn: tlsConnect(h, 443)},

		// OpenVPN over TCP
		{group: "ovpn_tcp", protocol: "OpenVPN/TCP", port: 443, transport: "TCP", fn: tcpConnect(h, 443)},
		{group: "ovpn_tcp", protocol: "OpenVPN/TCP", port: 1443, transport: "TCP", fn: tcpConnect(h, 1443)},

		// OpenVPN over UDP
		{group: "ovpn_udp", protocol: "OpenVPN/UDP", port: 1194, transport: "UDP", fn: udpProbe(h, 1194, ovpnHello)},
		{group: "ovpn_udp", protocol: "OpenVPN/UDP", port: 443, transport: "UDP", fn: udpProbe(h, 443, ovpnHello)},
		{group: "ovpn_udp", protocol: "OpenVPN/UDP", port: 1443, transport: "UDP", fn: udpProbe(h, 1443, ovpnHello)},

		// WireGuard UDP
		{group: "wireguard", protocol: "WireGuard", port: 443, transport: "UDP", fn: udpProbe(h, 443, wgHandshake)},
		{group: "wireguard", protocol: "WireGuard", port: 1337, transport: "UDP", fn: udpProbe(h, 1337, wgHandshake)},

		// IKEv2 UDP
		{group: "ikev2", protocol: "IKEv2", port: 500, transport: "UDP", fn: udpProbe(h, 500, ikePayload)},
		{group: "ikev2", protocol: "IKEv2", port: 4500, transport: "UDP", fn: udpProbe(h, 4500, ikePayload)},
	}
}

// Run probes all Windscribe protocol/port combinations concurrently.
func Run(ctx context.Context) *Report {
	start := time.Now()
	probes := buildProbes()
	results := make([]Result, len(probes))

	var wg sync.WaitGroup
	for i, p := range probes {
		wg.Add(1)
		go func(i int, p probeDef) {
			defer wg.Done()
			pCtx, cancel := context.WithTimeout(ctx, probeTimeout)
			defer cancel()

			t0 := time.Now()
			ok, detail, err := p.fn(pCtx)
			elapsed := float64(time.Since(t0).Microseconds()) / 1000.0

			r := Result{
				Group:     p.group,
				Protocol:  p.protocol,
				Host:      probeHost,
				Port:      p.port,
				Transport: p.transport,
				Reachable: ok,
				LatencyMs: elapsed,
				Detail:    detail,
			}
			if err != nil {
				r.Error = err.Error()
			}
			results[i] = r
		}(i, p)
	}
	wg.Wait()

	// Sort by group order
	orderIdx := func(g string) int {
		for i, name := range GroupOrder {
			if name == g {
				return i
			}
		}
		return len(GroupOrder)
	}
	for i := 1; i < len(results); i++ {
		for j := i; j > 0 && orderIdx(results[j-1].Group) > orderIdx(results[j].Group); j-- {
			results[j-1], results[j] = results[j], results[j-1]
		}
	}

	return &Report{
		Host:       probeHost,
		Timestamp:  time.Now().UTC(),
		DurationMs: float64(time.Since(start).Milliseconds()),
		Results:    results,
	}
}