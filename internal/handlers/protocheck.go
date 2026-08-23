// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/protocheck"
	"github.com/gin-gonic/gin"
)

// HandleProtoCheckRun probes common protocols and ports from the local
// network and returns a reachability report with detected network info.
func HandleProtoCheckRun(c *gin.Context) {
	report := protocheck.Run(c.Request.Context())
	c.JSON(http.StatusOK, report)
}
