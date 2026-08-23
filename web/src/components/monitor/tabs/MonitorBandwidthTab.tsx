/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { MonitorAgent } from "@/api/monitor";
import { useMonitorAgent } from "@/hooks/useMonitorAgent";
import { MonitorBandwidthChart } from "../MonitorBandwidthChart";
import { MonitorOfflineBanner } from "../MonitorOfflineBanner";
import { formatBytes } from "@/utils/formatBytes";

interface MonitorBandwidthTabProps {
  agent: MonitorAgent;
}

export const MonitorBandwidthTab: React.FC<MonitorBandwidthTabProps> = ({
  agent,
}) => {
  const { t } = useTranslation();
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "6h" | "12h" | "24h" | "48h" | "7d" | "30d"
  >("24h");
  const { nativeData, status, peakStats } = useMonitorAgent({
    agent,
    includeNativeData: true,
    includePeakStats: true,
  });

  // Process bandwidth data based on selected time range
  const chartData = useMemo(() => {
    if (!nativeData?.interfaces?.[0]?.traffic) {
      return { data: [], title: t("monitor.bandwidthTab.noData", "No Data"), timeFormat: "hour" as const };
    }

    const traffic = nativeData.interfaces[0].traffic;

    switch (selectedTimeRange) {
      case "6h": {
        const title = t("monitor.bandwidthTab.hourlyBandwidth", "Hourly Bandwidth ({{hours}} hours)", { hours: 6 });
        if (!traffic.hour)
          return {
            data: [],
            title,
            timeFormat: "hour" as const,
          };
        return {
          data: traffic.hour.slice(-6).map((hour) => ({
            time: new Date(
              hour.date.year,
              hour.date.month - 1,
              hour.date.day || 1,
              hour.time?.hour || 0
            ).toISOString(),
            rx: hour.rx,
            tx: hour.tx,
          })),
          title,
          timeFormat: "hour" as const,
        };
      }
      case "12h": {
        const title = t("monitor.bandwidthTab.hourlyBandwidth", "Hourly Bandwidth ({{hours}} hours)", { hours: 12 });
        if (!traffic.hour)
          return {
            data: [],
            title,
            timeFormat: "hour" as const,
          };
        return {
          data: traffic.hour.slice(-12).map((hour) => ({
            time: new Date(
              hour.date.year,
              hour.date.month - 1,
              hour.date.day || 1,
              hour.time?.hour || 0
            ).toISOString(),
            rx: hour.rx,
            tx: hour.tx,
          })),
          title,
          timeFormat: "hour" as const,
        };
      }
      case "24h": {
        const title = t("monitor.bandwidthTab.hourlyBandwidth", "Hourly Bandwidth ({{hours}} hours)", { hours: 24 });
        if (!traffic.hour)
          return {
            data: [],
            title,
            timeFormat: "hour" as const,
          };
        return {
          data: traffic.hour.slice(-24).map((hour) => ({
            time: new Date(
              hour.date.year,
              hour.date.month - 1,
              hour.date.day || 1,
              hour.time?.hour || 0
            ).toISOString(),
            rx: hour.rx,
            tx: hour.tx,
          })),
          title,
          timeFormat: "hour" as const,
        };
      }
      case "48h": {
        const title = t("monitor.bandwidthTab.hourlyBandwidth", "Hourly Bandwidth ({{hours}} hours)", { hours: 48 });
        if (!traffic.hour)
          return {
            data: [],
            title,
            timeFormat: "hour" as const,
          };
        return {
          data: traffic.hour.slice(-48).map((hour) => ({
            time: new Date(
              hour.date.year,
              hour.date.month - 1,
              hour.date.day || 1,
              hour.time?.hour || 0
            ).toISOString(),
            rx: hour.rx,
            tx: hour.tx,
          })),
          title,
          timeFormat: "hour" as const,
        };
      }
      case "7d": {
        const title = t("monitor.bandwidthTab.dailyBandwidth", "Daily Bandwidth ({{days}} days)", { days: 7 });
        if (!traffic.day)
          return {
            data: [],
            title,
            timeFormat: "day" as const,
          };
        return {
          data: traffic.day.slice(-7).map((day) => ({
            time: new Date(
              day.date.year,
              day.date.month - 1,
              day.date.day
            ).toISOString(),
            rx: day.rx,
            tx: day.tx,
          })),
          title,
          timeFormat: "day" as const,
        };
      }
      case "30d": {
        const title = t("monitor.bandwidthTab.dailyBandwidth", "Daily Bandwidth ({{days}} days)", { days: 30 });
        if (!traffic.day)
          return {
            data: [],
            title,
            timeFormat: "day" as const,
          };
        return {
          data: traffic.day.slice(-30).map((day) => ({
            time: new Date(
              day.date.year,
              day.date.month - 1,
              day.date.day
            ).toISOString(),
            rx: day.rx,
            tx: day.tx,
          })),
          title,
          timeFormat: "day" as const,
        };
      }
    }
  }, [nativeData, selectedTimeRange, t]);

  if (!nativeData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center py-12"
      >
        <p className="text-lg text-gray-500 dark:text-gray-400">
          {t("monitor.bandwidthTab.loadingBandwidthData", "Loading bandwidth data...")}
        </p>
      </motion.div>
    );
  }

  const isOffline = !status?.connected;
  const isFromCache = nativeData?.from_cache || false;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Offline Banner */}
      {isOffline && isFromCache && (
        <MonitorOfflineBanner message={t("monitor.bandwidthTab.offlineBannerMessage", "Showing cached bandwidth data. Real-time monitoring unavailable.")} />
      )}

      {chartData.data.length > 0 ? (
        <MonitorBandwidthChart
          data={chartData.data}
          title={chartData.title}
          timeFormat={chartData.timeFormat}
          selectedTimeRange={selectedTimeRange}
          onTimeRangeChange={setSelectedTimeRange}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center py-8 sm:py-12 bg-gray-50/95 dark:bg-gray-850/95 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800"
        >
          <div className="flex justify-center mb-3 sm:mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400">
            {t("monitor.bandwidthTab.noBandwidthDataAvailable", "No bandwidth data available")}
          </p>
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1.5 sm:mt-2">
            {t("monitor.bandwidthTab.noBandwidthDataHint", "The agent may have just been added or monitor hasn't collected enough data yet.")}
          </p>
        </motion.div>
      )}

      {/* Total Statistics */}
      {nativeData?.interfaces?.[0]?.traffic && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gray-50/95 dark:bg-gray-850/95 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              {t("monitor.bandwidthTab.totalStatistics", "Total Statistics")}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* All-time totals */}
            {nativeData.interfaces[0].traffic.total && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {t("monitor.bandwidthTab.allTimeDownload", "All-time Download")}
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {formatBytes(nativeData.interfaces[0].traffic.total.rx)}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {t("monitor.bandwidthTab.allTimeUpload", "All-time Upload")}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatBytes(nativeData.interfaces[0].traffic.total.tx)}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                  className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {t("monitor.bandwidthTab.combinedTotal", "Combined Total")}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatBytes(
                      nativeData.interfaces[0].traffic.total.rx +
                        nativeData.interfaces[0].traffic.total.tx
                    )}
                  </p>
                </motion.div>
              </>
            )}
          </div>

          {/* Current periods */}
          <div className="grid gap-6 sm:grid-cols-2 mt-6">
            {/* Today */}
            {nativeData.interfaces[0].traffic.day?.[0] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4"
              >
                <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
                  {t("monitor.bandwidthTab.today", "Today")}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 sm:gap-2">
                      <ArrowDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                      <span>{t("monitor.bandwidthTab.downloaded", "Downloaded")}</span>
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {formatBytes(nativeData.interfaces[0].traffic.day[0].rx)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 sm:gap-2">
                      <ArrowUpIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t("monitor.bandwidthTab.uploaded", "Uploaded")}</span>
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {formatBytes(nativeData.interfaces[0].traffic.day[0].tx)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {t("monitor.bandwidthTab.total", "Total")}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                        {formatBytes(
                          nativeData.interfaces[0].traffic.day[0].rx +
                            nativeData.interfaces[0].traffic.day[0].tx
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* This Month */}
            {nativeData.interfaces[0].traffic.month?.[0] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.45 }}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4"
              >
                <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
                  {t("monitor.bandwidthTab.thisMonth", "This Month")}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 sm:gap-2">
                      <ArrowDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                      <span>{t("monitor.bandwidthTab.downloaded", "Downloaded")}</span>
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {formatBytes(
                        nativeData.interfaces[0].traffic.month[0].rx
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 sm:gap-2">
                      <ArrowUpIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t("monitor.bandwidthTab.uploaded", "Uploaded")}</span>
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {formatBytes(
                        nativeData.interfaces[0].traffic.month[0].tx
                      )}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {t("monitor.bandwidthTab.total", "Total")}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                        {formatBytes(
                          nativeData.interfaces[0].traffic.month[0].rx +
                            nativeData.interfaces[0].traffic.month[0].tx
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Peak Times and Averages */}
      {nativeData?.interfaces?.[0]?.traffic && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-gray-50/95 dark:bg-gray-850/95 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              {t("monitor.bandwidthTab.peakTimesAndAverages", "Peak Times & Averages")}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Peak Times */}
            <div className="space-y-4">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("monitor.bandwidthTab.peakBandwidth", "Peak Bandwidth")}
              </h4>

              {peakStats && (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.35 }}
                    className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <ArrowDownIcon className="h-4 w-4" />
                        <span>{t("monitor.bandwidthTab.peakDownload", "Peak Download")}</span>
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {peakStats.peak_rx_string}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <ArrowUpIcon className="h-4 w-4" />
                        <span>{t("monitor.bandwidthTab.peakUpload", "Peak Upload")}</span>
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {peakStats.peak_tx_string}
                      </span>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Averages */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("monitor.bandwidthTab.dailyAverages", "Daily Averages")}
              </h4>

              {nativeData.interfaces[0].traffic.day &&
                nativeData.interfaces[0].traffic.day.length > 0 &&
                (() => {
                  const last7Days = nativeData.interfaces[0].traffic.day.slice(-7);
                  const avgRx =
                    last7Days.reduce((sum, day) => sum + day.rx, 0) /
                    last7Days.length;
                  const avgTx =
                    last7Days.reduce((sum, day) => sum + day.tx, 0) /
                    last7Days.length;
                  const avgTotal = avgRx + avgTx;

                  return (
                    <div className="space-y-3">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.45 }}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("monitor.bandwidthTab.avgDailyDownload", "Avg Daily Download")}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatBytes(avgRx)}
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("monitor.bandwidthTab.avgDailyUpload", "Avg Daily Upload")}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatBytes(avgTx)}
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.55 }}
                        className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                            {t("monitor.bandwidthTab.avgDailyTotal", "Avg Daily Total")}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatBytes(avgTotal)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t("monitor.bandwidthTab.basedOnLast7Days", "Based on last 7 days")}
                        </p>
                      </motion.div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
