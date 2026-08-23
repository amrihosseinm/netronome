/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SignalIcon,
  PlayIcon,
  ArrowPathIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/common/Toast";
import { InfoTooltip } from "./InfoTooltip";
import { GuideSection } from "./GuideSection";

interface TestResult {
  group: string;
  protocol: string;
  host: string;
  port: number;
  reachable: boolean;
  latency_ms: number;
  detail?: string;
  error?: string;
}

interface NetworkInfo {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
}

interface ProtoCheckReport {
  network?: NetworkInfo;
  timestamp: string;
  duration_ms: number;
  results: TestResult[];
}

const GROUP_ORDER = [
  "web",
  "cdn_alt_tls",
  "cdn_alt_http",
  "dns",
  "quic",
  "ssh",
  "udp",
] as const;

export function ProtocolCheckerPanel() {
  const { t } = useTranslation();
  const [report, setReport] = useState<ProtoCheckReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCheck = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/protocheck/run", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: ProtoCheckReport = await res.json();
      setReport(data);
      const reachable = data.results?.filter((r) => r.reachable).length ?? 0;
      showToast(
        t("iranTools.protocolChecker.completedTitle"),
        "success",
        {
          description: t("iranTools.protocolChecker.completedDesc", {
            reachable,
            total: data.results?.length ?? 0,
          }),
        }
      );
    } catch (err) {
      showToast(t("iranTools.protocolChecker.checkFailed"), "error", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const grouped = (() => {
    if (!report?.results) return [];
    return GROUP_ORDER.map((group) => ({
      group,
      items: report.results.filter((r) => r.group === group),
    })).filter((g) => g.items.length > 0);
  })();

  const networkLine = report?.network
    ? [
        report.network.city,
        report.network.region,
        report.network.country,
      ]
      .filter(Boolean)
      .join(" — ")
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <SignalIcon className="w-5 h-5 text-indigo-500" />
          {t("iranTools.protocolChecker.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("iranTools.protocolChecker.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {!isRunning ? (
            <Button onClick={runCheck} className="gap-2">
              {report ? (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  {t("iranTools.protocolChecker.rerunButton")}
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  {t("iranTools.protocolChecker.startButton")}
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              {t("iranTools.protocolChecker.running")}
            </Button>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <InfoTooltip text={t("iranTools.protocolChecker.durationTooltip")} />
            {report &&
              t("iranTools.protocolChecker.lastRun", {
                seconds: (report.duration_ms / 1000).toFixed(1),
              })}
          </span>
        </div>

        {report?.network && (
          <div className="flex items-start gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-4 py-3">
            <MapPinIcon className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white">
                {t("iranTools.protocolChecker.networkLabel")}
              </div>
              <div className="text-gray-600 dark:text-gray-400 mt-0.5">
                {networkLine || t("iranTools.protocolChecker.networkUnknown")}
              </div>
              <div className="text-gray-500 dark:text-gray-500 mt-0.5 flex flex-wrap gap-x-3" dir="ltr">
                {report.network.isp && <span>{report.network.isp}</span>}
                {report.network.ip && <span className="font-mono">{report.network.ip}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map(({ group, items }) => {
            const reachable = items.filter((i) => i.reachable).length;
            return (
              <div
                key={group}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(`iranTools.protocolChecker.groups.${group}`)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      reachable === items.length
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : reachable === 0
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {t("iranTools.protocolChecker.groupSummary", {
                      reachable,
                      total: items.length,
                    })}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((item, idx) => (
                    <li
                      key={`${item.host}:${item.port}:${idx}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.reachable ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
                            {item.protocol}
                            <span className="text-gray-400 dark:text-gray-500 mx-1">·</span>
                            <span className="font-mono">{item.host}:{item.port}</span>
                          </div>
                          {(item.detail || item.error) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate" dir="ltr">
                              {item.detail || item.error}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-mono text-gray-500 dark:text-gray-400">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {item.latency_ms.toFixed(0)} ms
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {!report && !isRunning && (
        <div className="p-12 text-center border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
          <SignalIcon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {t("iranTools.protocolChecker.noData")}
          </p>
        </div>
      )}

      <GuideSection title={t("iranTools.protocolChecker.guide.title")}>
        <p>{t("iranTools.protocolChecker.guide.p1")}</p>
        <p>{t("iranTools.protocolChecker.guide.p2")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("iranTools.protocolChecker.guide.li1")}</li>
          <li>{t("iranTools.protocolChecker.guide.li2")}</li>
          <li>{t("iranTools.protocolChecker.guide.li3")}</li>
          <li>{t("iranTools.protocolChecker.guide.li4")}</li>
        </ul>
      </GuideSection>
    </div>
  );
}
