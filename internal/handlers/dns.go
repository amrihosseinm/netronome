// Copyright (c) 2024-2026, s0up and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package handlers

import (
	"net/http"

	"github.com/autobrr/netronome/pkg/dnsbench"
	"github.com/gin-gonic/gin"
)

// HandleDNSBenchmark runs a concurrent DNS benchmark and returns the results
func HandleDNSBenchmark(c *gin.Context) {
	// Use default resolvers and domains
	results := dnsbench.RunBenchmark(nil, nil)
	c.JSON(http.StatusOK, results)
}
