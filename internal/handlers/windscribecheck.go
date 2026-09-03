// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/windscribecheck"
	"github.com/gin-gonic/gin"
)

// HandleWindscribeCheck probes Windscribe VPN protocol/port combinations
// from the server's network and returns a reachability report.
func HandleWindscribeCheck(c *gin.Context) {
	report := windscribecheck.Run(c.Request.Context())
	c.JSON(http.StatusOK, report)
}