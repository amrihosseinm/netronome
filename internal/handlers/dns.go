// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/dnsbench"
	"github.com/gin-gonic/gin"
)

type DNSSetRequest struct {
	IP          string `json:"ip"`
	SecondaryIP string `json:"secondary_ip"`
}

// HandleDNSBenchmark runs a concurrent DNS benchmark and returns the results
func HandleDNSBenchmark(c *gin.Context) {
	// Use default resolvers and domains
	results := dnsbench.RunBenchmark(nil, nil)
	c.JSON(http.StatusOK, results)
}

// HandleSetDNS applies the given DNS IP to the active Windows network interface
func HandleSetDNS(c *gin.Context) {
	var req DNSSetRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.IP == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request or missing IP"})
		return
	}

	err := dnsbench.SetWindowsDNS(req.IP, req.SecondaryIP)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "DNS updated successfully"})
}
