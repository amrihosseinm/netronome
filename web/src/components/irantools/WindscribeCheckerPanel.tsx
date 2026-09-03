/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheckIcon,
  PlayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/common/Toast";
import { GuideSection } from "./GuideSection";
import { getApiUrl } from "@/utils/baseUrl";

interface WindscribeResult {
  group: string;
  protocol: string;
  host: string;
  port: number;
  transport: string;
  reachable: boolean;
  latency_ms: number;
  detail?: string;
  error?: string;
}

interface WindscribeReport {
  host: string;
  timestamp: string;
  duration_ms: number;
  results: WindscribeResult[];
}

const GROUP_ORDER = [
  "stealth",
  "wstunnel",
  "ovpn_tcp",
  "ovpn_udp",
  "wireguard",
  "ikev2",
] as const;

const TRANSPORT_BADGE: Record<string, string> = {
  TCP: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  TLS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  UDP: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

export function WindscribeCheckerPanel() {
  const { t } = useTranslation();
  const [report, setReport] = useState<WindscribeReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCheck = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(getApiUrl("/windscribecheck/run"), {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: WindscribeReport = await res.json();
      setReport(data);
      const reachable = data.results?.filter((r) => r.reachable).length ?? 0;
      showToast(t("iranTools.windscribeChecker.completedTitle"), "success", {
        description: t("iranTools.windscribeChecker.completedDesc", {
          reachable,
          total: data.results?.length ?? 0,
        }),
      });
    } catch (err) {
      showToast(t("iranTools.windscribeChecker.checkFailed"), "error", {
        description: t("common.loadFailedHint"),
      });
      console.error("Windscribe check failed:", err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
          {t("iranTools.windscribeChecker.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("iranTools.windscribeChecker.description")}
        </p>
      </div>

      {/* Control card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {!isRunning ? (
            <Button onClick={runCheck} className="gap-2">
              {report ? (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  {t("iranTools.windscribeChecker.rerunButton")}
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  {t("iranTools.windscribeChecker.startButton")}
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              {t("iranTools.windscribeChecker.running")}
            </Button>
          )}
          {report && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("iranTools.windscribeChecker.lastRun", {
                seconds: (report.duration_ms / 1000).toFixed(1),
              })}
            </span>
          )}
        </div>

        {/* Host info */}
        {report && (
          <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1" dir="ltr">
            <span className="font-medium text-gray-500 dark:text-gray-400">
              {t("iranTools.windscribeChecker.probeHost")}:
            </span>
            <span className="font-mono">{report.host}</span>
          </div>
        )}
      </div>

      {/* Results grouped by protocol */}
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
                    {t(`iranTools.windscribeChecker.groups.${group}`)}
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
                    {t("iranTools.windscribeChecker.groupSummary", {
                      reachable,
                      total: items.length,
                    })}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((item, idx) => (
                    <li
                      key={`${item.port}-${item.transport}-${idx}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.reachable ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0" dir="ltr">
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span>{item.protocol}</span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                                TRANSPORT_BADGE[item.transport] ??
                                "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {item.transport}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 font-mono">
                              :{item.port}
                            </span>
                          </div>
                          {(item.detail || item.error) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
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

      {/* Empty state */}
      {!report && !isRunning && (
        <div className="p-12 text-center border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
          <ShieldCheckIcon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {t("iranTools.windscribeChecker.noData")}
          </p>
        </div>
      )}

      <GuideSection title={t("iranTools.windscribeChecker.guide.title")}>
        <p>{t("iranTools.windscribeChecker.guide.p1")}</p>
        <p>{t("iranTools.windscribeChecker.guide.p2")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("iranTools.windscribeChecker.guide.li1")}</li>
          <li>{t("iranTools.windscribeChecker.guide.li2")}</li>
          <li>{t("iranTools.windscribeChecker.guide.li3")}</li>
          <li>{t("iranTools.windscribeChecker.guide.li4")}</li>
        </ul>
      </GuideSection>
    </div>
  );
}