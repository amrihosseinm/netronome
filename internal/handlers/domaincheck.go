// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/domaincheck"
	"github.com/gin-gonic/gin"
)

type DomainCheckRequest struct {
	Domains []string `json:"domains"`
}

// HandleDomainCheck scans a list of domains (or the built-in default list)
// and reports whether each one is currently reachable.
func HandleDomainCheck(c *gin.Context) {
	var req DomainCheckRequest
	// Body is optional; ignore bind errors and fall back to defaults.
	_ = c.ShouldBindJSON(&req)

	results := domaincheck.CheckDomains(req.Domains)
	c.JSON(http.StatusOK, gin.H{
		"results": results,
	})
}

// HandleDomainCheckDefaults returns the built-in default domain list so the
// UI can display/edit it before running a scan.
func HandleDomainCheckDefaults(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"domains": domaincheck.DefaultDomains,
	})
}
