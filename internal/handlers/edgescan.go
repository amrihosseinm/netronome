// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/edgescan"
	"github.com/gin-gonic/gin"
)

type EdgeScanStartRequest struct {
	SNI     string   `json:"sni" binding:"required"`
	Ranges  []string `json:"ranges"`
	Workers int      `json:"workers"`
}

// HandleEdgeScanStart starts a new edge/CDN IP scan session.
func HandleEdgeScanStart(c *gin.Context) {
	var req EdgeScanStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sni is required"})
		return
	}

	ranges := req.Ranges
	if len(ranges) == 0 {
		ranges = edgescan.CloudflareRanges
	}

	if err := edgescan.Start(req.SNI, ranges, req.Workers); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "edge scan started", "sni": req.SNI})
}

// HandleEdgeScanStop stops the current edge scan session.
func HandleEdgeScanStop(c *gin.Context) {
	edgescan.Stop()
	c.JSON(http.StatusOK, gin.H{"message": "edge scan stopped"})
}

// HandleEdgeScanStatus returns the current edge scan session status.
func HandleEdgeScanStatus(c *gin.Context) {
	c.JSON(http.StatusOK, edgescan.GetStatus())
}

// HandleEdgeScanDefaultRanges returns the built-in Cloudflare IP ranges.
func HandleEdgeScanDefaultRanges(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"ranges": edgescan.CloudflareRanges})
}
