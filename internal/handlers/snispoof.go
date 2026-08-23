// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/snispoof"
	"github.com/gin-gonic/gin"
)

type SNISpoofCheckRequest struct {
	TargetDomain string `json:"target_domain" binding:"required"`
	SpoofedSNI   string `json:"spoofed_sni" binding:"required"`
	IP           string `json:"ip"`
}

// HandleSNISpoofCheck checks whether SNI spoofing/domain fronting works for
// the given target domain on the current network.
func HandleSNISpoofCheck(c *gin.Context) {
	var req SNISpoofCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_domain and spoofed_sni are required"})
		return
	}

	result, err := snispoof.Check(c.Request.Context(), req.TargetDomain, req.SpoofedSNI, req.IP)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
