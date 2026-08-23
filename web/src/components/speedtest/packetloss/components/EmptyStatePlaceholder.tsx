/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { PersianTooltip } from "@/components/common/PersianTooltip";
import {
  ChartBarIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SignalIcon,
  GlobeAltIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";

interface EmptyStatePlaceholderProps {
  mode?: "traceroute" | "monitors";
  onHostSelect?: (host: string) => void;
  onSwitchToMonitors?: () => void;
}

export const EmptyStatePlaceholder: React.FC<EmptyStatePlaceholderProps> = ({
  mode = "monitors",
  onHostSelect,
  onSwitchToMonitors,
}) => {
  const { t } = useTranslation();
  if (mode === "traceroute") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1"
      >
        <div className="bg-gray-50/95 dark:bg-gray-850/95 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GlobeAltIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
              {t("traceroute.empty.runTraceroute", "Run a Traceroute")}
              <PersianTooltip text="اجرای Traceroute. این ابزار هر گره (Hop) در مسیر رسیدن به یک مقصد را بررسی می‌کند تا تأخیر و مشکلات را نشان دهد." />
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t("traceroute.empty.runTracerouteDesc", "Discover every hop packets take to reach a destination")}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <PlayIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-blue-700 dark:text-blue-300 text-sm font-medium mb-1">
                    {t("traceroute.empty.quickStart", "Quick Start")}
                  </h3>
                  <p className="text-blue-700/80 dark:text-blue-300/80 text-xs mb-3">
                    {t("traceroute.empty.quickStartDesc", "Enter any hostname or IP address to trace its route, or try these popular destinations:")}
                  </p>
                  {onHostSelect && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onHostSelect("google.com")}
                        className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded text-xs transition-colors"
                      >
                        google.com
                      </button>
                      <button
                        onClick={() => onHostSelect("cloudflare.com")}
                        className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded text-xs transition-colors"
                      >
                        cloudflare.com
                      </button>
                      <button
                        onClick={() => onHostSelect("github.com")}
                        className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded text-xs transition-colors"
                      >
                        github.com
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-gray-200/30 dark:bg-gray-800/30 rounded-lg">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GlobeAltIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">
                    {t("traceroute.empty.hopByHop", "Hop-by-Hop Analysis")}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    {t("traceroute.empty.hopByHopDesc", "See each router in the path")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-200/30 dark:bg-gray-800/30 rounded-lg">
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SignalIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">
                    {t("traceroute.empty.createMonitor", "Create Monitor")}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    {t("traceroute.empty.createMonitorPrefix", "Convert results into a")}{" "}
                    {onSwitchToMonitors ? (
                      <button
                        onClick={onSwitchToMonitors}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline"
                      >
                        {t("traceroute.empty.scheduledMonitor", "scheduled monitor")}
                      </button>
                    ) : (
                      t("traceroute.empty.scheduledMonitor", "scheduled monitor")
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Monitors mode (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex-1"
    >
      <div className="bg-gray-50/95 dark:bg-gray-850/95 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t("packetLoss.empty.title", "Packet Loss Monitoring")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t("packetLoss.empty.description", "Track packet loss percentage to specific hosts over time")}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-gray-200/30 dark:bg-gray-800/30 rounded-lg">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <WifiIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">
                  {t("packetLoss.empty.scheduledTesting", "Scheduled Testing")}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  {t("packetLoss.empty.scheduledTestingDesc", "Tests run automatically at your interval")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-200/30 dark:bg-gray-800/30 rounded-lg">
              <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">
                  {t("packetLoss.empty.alerts", "Packet Loss Alerts")}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  {t("packetLoss.empty.alertsDesc", "Get notified when loss exceeds thresholds")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-200/30 dark:bg-gray-800/30 rounded-lg">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <ChartBarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">
                  {t("packetLoss.empty.historicalCharts", "Historical Charts")}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  {t("packetLoss.empty.historicalChartsDesc", "View trends and patterns over time")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-200/30 dark:bg-gray-800/30 rounded-lg">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClockIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-white text-sm font-medium mb-1">
                  {t("packetLoss.empty.smartTesting", "Smart Testing Method")}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  {t("packetLoss.empty.smartTestingDesc", "MTR when available (requires root), ICMP ping otherwise")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <SignalIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-blue-700 dark:text-blue-300 text-sm font-medium mb-1">
                {t("packetLoss.empty.getStarted", "Get Started")}
              </h4>
              <p className="text-blue-700/80 dark:text-blue-300/80 text-xs">
                {t("packetLoss.empty.getStartedDesc", "Select a monitor to view packet loss history and real-time status.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
