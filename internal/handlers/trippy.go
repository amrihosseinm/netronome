// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/trippy"
	"github.com/gin-gonic/gin"
)

type TrippyStartRequest struct {
	Host       string `json:"host" binding:"required"`
	MaxHistory int    `json:"max_history"`
}

// HandleTrippyStart starts a continuous traceroute session
func HandleTrippyStart(c *gin.Context) {
	var req TrippyStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "host is required"})
		return
	}

	if err := trippy.Start(req.Host, req.MaxHistory); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "trippy session started", "host": req.Host})
}

// HandleTrippyStop stops the current session
func HandleTrippyStop(c *gin.Context) {
	trippy.Stop()
	c.JSON(http.StatusOK, gin.H{"message": "trippy session stopped"})
}

// HandleTrippyStatus returns current session status
func HandleTrippyStatus(c *gin.Context) {
	status := trippy.GetStatus()
	c.JSON(http.StatusOK, status)
}
