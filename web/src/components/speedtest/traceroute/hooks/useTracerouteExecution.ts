/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TracerouteResult, TracerouteUpdate } from "@/types/types";
import { runTraceroute } from "@/api/speedtest";
import { extractHostname } from "../utils/tracerouteUtils";
import { DEFAULT_TRACEROUTE_CONFIG } from "../constants/tracerouteConstants";
import { showToast } from "@/components/common/Toast";

interface UseTracerouteExecutionProps {
  onStatusUpdate?: (status: TracerouteUpdate | null) => void;
  onError?: (error: string | null) => void;
}

export const useTracerouteExecution = ({
  onStatusUpdate,
  onError,
}: UseTracerouteExecutionProps = {}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const tracerouteMutation = useMutation({
    mutationFn: runTraceroute,
    onMutate: (targetHost: string) => {
      // Clear previous results and error state
      queryClient.setQueryData(["traceroute", "results"], null);
      onError?.(null);
      showToast(t("traceroute.startedToast", "Traceroute started"), "success", {
        description: t("traceroute.tracingTo", "Tracing route to {{host}}", { host: targetHost }),
      });

      // Set initial status
      const initialStatus: TracerouteUpdate = {
        type: "traceroute",
        host: targetHost,
        progress: DEFAULT_TRACEROUTE_CONFIG.initialProgress,
        isComplete: false,
        currentHop: 0,
        totalHops: DEFAULT_TRACEROUTE_CONFIG.totalHops,
        isScheduled: false,
        hops: [],
        destination: targetHost,
        ip: "",
      };

      onStatusUpdate?.(initialStatus);
    },
    onSuccess: (data: TracerouteResult) => {
      queryClient.setQueryData(["traceroute", "results"], data);
      onStatusUpdate?.(null);
      onError?.(null);
      showToast(t("traceroute.completedToast", "Traceroute completed"), "success", {
        description: t("traceroute.completedDesc", "Route to {{host}} traced successfully ({{count}} hops)", {
          host: data.destination,
          count: data.hops.length,
        }),
      });
    },
    onError: (error: Error) => {
      console.error("Traceroute failed:", error);
      onStatusUpdate?.(null);
      const errorMessage =
        error.message ||
        t("traceroute.failedDefault", "Traceroute failed. Please check the hostname and try again.");
      onError?.(errorMessage);
      showToast(t("traceroute.failedToast", "Traceroute failed"), "error", {
        description: errorMessage,
      });
    },
  });

  const runTracerouteWithHostname = (
    host: string,
    selectedServerHost?: string
  ) => {
    let targetHost = selectedServerHost ? selectedServerHost : host.trim();
    if (!targetHost) return;

    // Extract hostname for all server types
    targetHost = extractHostname(targetHost);

    // Clear previous state before starting
    queryClient.setQueryData(["traceroute", "results"], null);
    onStatusUpdate?.(null);
    tracerouteMutation.mutate(targetHost);
  };

  return {
    runTraceroute: runTracerouteWithHostname,
    isRunning: tracerouteMutation.isPending,
    error: tracerouteMutation.error,
    data: tracerouteMutation.data,
    reset: tracerouteMutation.reset,
  };
};
