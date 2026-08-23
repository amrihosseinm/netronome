/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { ServerList } from "./ServerList";
import ScheduleManager from "./ScheduleManager";
import { Server, TestOptions, TestType, TestProgress as TestProgressType } from "@/types/types";
import { GuideSection } from "@/components/irantools/GuideSection";

interface SpeedTestTabProps {
  servers: Server[];
  selectedServers: Server[];
  onServerSelect: (server: Server) => void;
  options: TestOptions;
  onOptionsChange: (options: TestOptions) => void;
  testType: TestType;
  onTestTypeChange: (type: TestType) => void;
  isLoading: boolean;
  onRunTest: () => Promise<void>;
  progress: TestProgressType | null;
  allServers: Server[];
  isServersLoading?: boolean;
  isServersError?: boolean;
}

export const SpeedTestTab: React.FC<SpeedTestTabProps> = ({
  servers,
  selectedServers,
  onServerSelect,
  testType,
  onTestTypeChange,
  isLoading,
  onRunTest,
  progress,
  allServers,
  isServersLoading,
  isServersError,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Server Selection - Primary Tool (Schedule Manager nested under it as Advanced) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        data-tour="speedtest-servers"
      >
        <ServerList
          servers={servers}
          selectedServers={selectedServers}
          onSelect={onServerSelect}
          multiSelect={false}
          onMultiSelectChange={() => {}}
          onRunTest={onRunTest}
          isLoading={isLoading}
          testType={testType}
          onTestTypeChange={onTestTypeChange}
          isServersLoading={isServersLoading}
          isServersError={isServersError}
          progress={progress}
          advancedContent={
            <ScheduleManager
              servers={allServers}
              selectedServers={selectedServers}
              testType={testType}
              nested
            />
          }
        />
      </motion.div>

      {/* Speed Test Guide */}
      <GuideSection title={t("speedtest.guide.title", "About Speed Test")}>
        <p>{t("speedtest.guide.p1", "The Speed Test tab lets you measure your network's download speed, upload speed, and ping latency using various server protocols including Speedtest.net, LibreSpeed, and iperf3.")}</p>
        <p>{t("speedtest.guide.p2", "Select a server closest to you for the most accurate results, or choose a distant server to test international connectivity.")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("speedtest.guide.li1", "Speedtest.net servers use the standard protocol and are widely available worldwide.")}</li>
          <li>{t("speedtest.guide.li2", "LibreSpeed servers are self-hosted alternatives using an open-source protocol.")}</li>
          <li>{t("speedtest.guide.li3", "iperf3 servers allow raw TCP/UDP throughput testing — great for LAN and datacenter testing.")}</li>
          <li>{t("speedtest.guide.li4", "Use the Schedule Manager (Advanced section inside Server Selection) to automate tests at regular intervals or specific times.")}</li>
          <li>{t("speedtest.guide.li5", "Results are saved and shown in the Dashboard tab for historical analysis.")}</li>
        </ul>
      </GuideSection>
    </div>
  );
};