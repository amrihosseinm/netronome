/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { TestProgress as TestProgressType } from "@/types/types";
import { SpeedGauge } from "./SpeedGauge";

interface TestProgressProps {
  progress: TestProgressType | null;
}

export const TestProgress: React.FC<TestProgressProps> = ({ progress }) => {
  const { t } = useTranslation();

  // Small inline status (dots + message) reused by preparing / running states
  const DotsMessage: React.FC<{ message: string }> = ({ message }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center gap-2 text-xs w-full"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <span className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
        {message}
      </span>
    </motion.div>
  );

  // Determine what content to show
  const getContent = () => {
    // If no progress, return null
    if (!progress) {
      return null;
    }

    // Hide ping/latency test phase
    if (progress.type === "ping") {
      return null;
    }

    // Check iperf3 preparing state BEFORE other conditions to prevent flash
    // Show preparing message for iperf3 during the initial ping phase
    // But hide it between download and upload tests
    if (
      progress.isIperf &&
      (progress.progress === 0 || !progress.progress) &&
      (progress.speed === 0 || !progress.speed)
    ) {
      // If we have a currentTest that's not empty, we're between tests
      if (progress.currentTest && progress.currentTest !== "") {
        return null; // Hide during transition between download/upload
      }

      return (
        <DotsMessage message={t("speedtest.preparingTest", "Preparing test...")} />
      );
    }

    // Show animated message for LibreSpeed
    if (progress.isLibrespeed) {
      return (
        <DotsMessage message={t("speedtest.runningLibreSpeed", "Running LibreSpeed test...")} />
      );
    }

    // Return a marker for actual test progress content
    return "testProgress";
  };

  const content = getContent();

  const isLivePhase =
    content === "testProgress" &&
    !!progress &&
    (progress.type === "download" || progress.type === "upload");

  const gaugeVariant =
    progress?.type === "upload"
      ? ("upload" as const)
      : progress?.type === "download"
      ? ("download" as const)
      : ("neutral" as const);

  const gaugeLabel =
    progress?.type === "upload"
      ? t("speedtest.gauge.upload", "Upload")
      : progress?.type === "download"
      ? t("speedtest.gauge.download", "Download")
      : t("speedtest.gauge.latency", "Latency");

  return (
    <div className="w-full flex justify-center">
      <AnimatePresence mode="wait">
        {isLivePhase && progress ? (
          // Live phase: speedtest.net-style circular gauge
          <motion.div
            key="gauge"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center py-2"
          >
            <SpeedGauge
              value={progress.currentSpeed}
              label={gaugeLabel}
              variant={gaugeVariant}
              progress={progress.progress}
              size={230}
            />
            {progress.currentServer && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center px-4 truncate max-w-full">
                {progress.currentServer}
              </span>
            )}
          </motion.div>
        ) : content && content !== "testProgress" ? (
          // Preparing / running messages - small inline status with stable height
          <motion.div
            key="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-5 w-full max-w-[16rem] flex items-center justify-center"
          >
            {content}
          </motion.div>
        ) : (
          // Empty state - maintains height but shows nothing
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            className="h-5"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
