// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package trippy

import (
"bufio"
"context"
"fmt"
"math"
"os/exec"
"regexp"
"runtime"
"strconv"
"strings"
"sync"
"time"

"github.com/rs/zerolog/log"
)

type HopStats struct {
Number   int     `json:"number"`
Host     string  `json:"host"`
IP       string  `json:"ip"`
Sent     int     `json:"sent"`
Recv     int     `json:"recv"`
Loss     float64 `json:"loss"`
Last     float64 `json:"last"`
Avg      float64 `json:"avg"`
Best     float64 `json:"best"`
Worst    float64 `json:"worst"`
StdDev   float64 `json:"stddev"`
sumRTT   float64
sumRTTSq float64
}

type HistoryPoint struct {
Timestamp int64    `json:"timestamp"`
Hops      []HopRTT `json:"hops"`
}

type HopRTT struct {
Number  int     `json:"number"`
RTT     float64 `json:"rtt"`
Timeout bool    `json:"timeout"`
}

type Status struct {
Running    bool           `json:"running"`
Host       string         `json:"host"`
Cycles     int            `json:"cycles"`
Hops       []HopStats     `json:"hops"`
History    []HistoryPoint `json:"history"`
LastUpdate int64          `json:"lastUpdate"`
Error      string         `json:"error,omitempty"`
}

type Session struct {
mu      sync.RWMutex
host    string
running bool
cancel  context.CancelFunc
hops    map[int]*HopStats
history []HistoryPoint
cycles  int
lastErr string
maxHist int
}

var (
globalSession *Session
sessionMu     sync.Mutex
)

func Start(host string, maxHistory int) error {
sessionMu.Lock()
defer sessionMu.Unlock()
if globalSession != nil && globalSession.running {
globalSession.stop()
}
if maxHistory <= 0 {
maxHistory = 60
}
ctx, cancel := context.WithCancel(context.Background())
s := &Session{
host:    host,
running: true,
cancel:  cancel,
hops:    make(map[int]*HopStats),
history: make([]HistoryPoint, 0, maxHistory),
maxHist: maxHistory,
}
globalSession = s
go s.run(ctx)
return nil
}

func Stop() {
sessionMu.Lock()
defer sessionMu.Unlock()
if globalSession != nil {
globalSession.stop()
}
}

func GetStatus() Status {
sessionMu.Lock()
s := globalSession
sessionMu.Unlock()
if s == nil {
return Status{Running: false}
}
s.mu.RLock()
defer s.mu.RUnlock()
hops := make([]HopStats, 0, len(s.hops))
maxHop := 0
for num := range s.hops {
if num > maxHop {
maxHop = num
}
}
for i := 1; i <= maxHop; i++ {
if h, ok := s.hops[i]; ok {
hops = append(hops, *h)
}
}
history := make([]HistoryPoint, len(s.history))
copy(history, s.history)
return Status{
Running:    s.running,
Host:       s.host,
Cycles:     s.cycles,
Hops:       hops,
History:    history,
LastUpdate: time.Now().UnixMilli(),
Error:      s.lastErr,
}
}

func (s *Session) stop() {
if s.cancel != nil {
s.cancel()
}
s.mu.Lock()
s.running = false
s.mu.Unlock()
}

func (s *Session) run(ctx context.Context) {
ticker := time.NewTicker(1 * time.Second)
defer ticker.Stop()
s.doCycle(ctx)
for {
select {
case <-ctx.Done():
s.mu.Lock()
s.running = false
s.mu.Unlock()
return
case <-ticker.C:
s.doCycle(ctx)
}
}
}
func (s *Session) doCycle(ctx context.Context) {
hops, err := runTraceroute(ctx, s.host)
if err != nil {
s.mu.Lock()
s.lastErr = err.Error()
s.mu.Unlock()
log.Warn().Err(err).Str("host", s.host).Msg("trippy: traceroute cycle failed")
return
}
now := time.Now().UnixMilli()
s.mu.Lock()
defer s.mu.Unlock()
s.cycles++
s.lastErr = ""
hp := HistoryPoint{Timestamp: now, Hops: make([]HopRTT, 0, len(hops))}
for _, h := range hops {
stats, ok := s.hops[h.Number]
if !ok {
stats = &HopStats{Number: h.Number, Host: h.Host, IP: h.IP, Best: math.MaxFloat64}
s.hops[h.Number] = stats
}
if h.Host != "*" && h.Host != "" {
stats.Host = h.Host
stats.IP = h.IP
}
stats.Sent++
if h.Timeout {
hp.Hops = append(hp.Hops, HopRTT{Number: h.Number, Timeout: true})
} else {
stats.Recv++
rtt := h.RTT
stats.Last = rtt
stats.sumRTT += rtt
stats.sumRTTSq += rtt * rtt
if rtt < stats.Best {
stats.Best = rtt
}
if rtt > stats.Worst {
stats.Worst = rtt
}
stats.Avg = stats.sumRTT / float64(stats.Recv)
variance := (stats.sumRTTSq / float64(stats.Recv)) - (stats.Avg * stats.Avg)
if variance < 0 {
variance = 0
}
stats.StdDev = math.Sqrt(variance)
hp.Hops = append(hp.Hops, HopRTT{Number: h.Number, RTT: rtt})
}
if stats.Sent > 0 {
stats.Loss = float64(stats.Sent-stats.Recv) / float64(stats.Sent) * 100.0
}
}
s.history = append(s.history, hp)
if len(s.history) > s.maxHist {
s.history = s.history[len(s.history)-s.maxHist:]
}
}

type rawHop struct {
Number  int
Host    string
IP      string
RTT     float64
Timeout bool
}

func runTraceroute(ctx context.Context, host string) ([]rawHop, error) {
var cmd *exec.Cmd
timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()
switch runtime.GOOS {
case "windows":
cmd = exec.CommandContext(timeoutCtx, "tracert", "-d", "-w", "2000", "-h", "30", host)
default:
cmd = exec.CommandContext(timeoutCtx, "traceroute", "-n", "-w", "2", "-m", "30", "-q", "1", host)
}
out, err := cmd.Output()
if err != nil {
return nil, fmt.Errorf("traceroute command failed: %w", err)
}
return parseTracerouteOutput(string(out))
}
func parseTracerouteOutput(output string) ([]rawHop, error) {
var hops []rawHop
scanner := bufio.NewScanner(strings.NewReader(output))
winHopRegex := regexp.MustCompile(`^\s*(\d+)\s+(<?[\d.]+)\s+ms\s+(<?[\d.]+)\s+ms\s+(<?[\d.]+)\s+ms\s+(.+)`)
winSingleRegex := regexp.MustCompile(`^\s*(\d+)\s+(<?[\d.]+)\s+ms\s+(.+)`)
winTimeoutRegex := regexp.MustCompile(`^\s*(\d+)\s+\*`)
unixHopRegex := regexp.MustCompile(`^\s*(\d+)\s+([^\s]+)\s+\(([^)]+)\)\s+([\d.]+)\s+ms`)
unixIPRegex := regexp.MustCompile(`^\s*(\d+)\s+([0-9A-Fa-f:.]+)\s+([\d.]+)\s+ms`)
unixTimeoutRegex := regexp.MustCompile(`^\s*(\d+)\s+\*`)
for scanner.Scan() {
line := scanner.Text()
if runtime.GOOS == "windows" {
if match := winHopRegex.FindStringSubmatch(line); match != nil {
hopNum, _ := strconv.Atoi(match[1])
rttStr := strings.TrimPrefix(match[2], "<")
rtt, _ := strconv.ParseFloat(rttStr, 64)
ip := strings.TrimSpace(match[5])
hops = append(hops, rawHop{Number: hopNum, Host: ip, IP: ip, RTT: rtt})
continue
}
if match := winSingleRegex.FindStringSubmatch(line); match != nil {
hopNum, _ := strconv.Atoi(match[1])
rttStr := strings.TrimPrefix(match[2], "<")
rtt, _ := strconv.ParseFloat(rttStr, 64)
ip := strings.TrimSpace(match[3])
hops = append(hops, rawHop{Number: hopNum, Host: ip, IP: ip, RTT: rtt})
continue
}
if match := winTimeoutRegex.FindStringSubmatch(line); match != nil {
hopNum, _ := strconv.Atoi(match[1])
hops = append(hops, rawHop{Number: hopNum, Host: "*", IP: "*", Timeout: true})
continue
}
} else {
if match := unixHopRegex.FindStringSubmatch(line); match != nil {
hopNum, _ := strconv.Atoi(match[1])
hostname := match[2]
ip := match[3]
rtt, _ := strconv.ParseFloat(match[4], 64)
hops = append(hops, rawHop{Number: hopNum, Host: hostname, IP: ip, RTT: rtt})
continue
}
if match := unixIPRegex.FindStringSubmatch(line); match != nil {
hopNum, _ := strconv.Atoi(match[1])
ip := match[2]
rtt, _ := strconv.ParseFloat(match[3], 64)
hops = append(hops, rawHop{Number: hopNum, Host: ip, IP: ip, RTT: rtt})
continue
}
if match := unixTimeoutRegex.FindStringSubmatch(line); match != nil {
hopNum, _ := strconv.Atoi(match[1])
hops = append(hops, rawHop{Number: hopNum, Host: "*", IP: "*", Timeout: true})
continue
}
}
}
if len(hops) == 0 {
return nil, fmt.Errorf("no hops parsed from traceroute output")
}
return hops, nil
}