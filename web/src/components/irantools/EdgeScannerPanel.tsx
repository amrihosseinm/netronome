/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ServerIcon,
  PlayIcon,
  StopIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/common/Toast";
import { copyToClipboard } from "@/utils/clipboard";
import { InfoTooltip } from "./InfoTooltip";
import { GuideSection } from "./GuideSection";
import { getApiUrl } from "@/utils/baseUrl";

interface IPResult {
  ip: string;
  success: boolean;
  latency_ms: number;
  status_code?: number;
  error?: string;
}

interface EdgeScanStatus {
  running: boolean;
  sni: string;
  total: number;
  scanned: number;
  found: number;
  results: IPResult[];
  error?: string;
}

const PRESET_DOMAINS = [
  "chat.openai.com",
  "discord.com",
  "www.speedtest.net",
  "cdn.jsdelivr.net",
  "www.cloudflare.com",
  "dash.cloudflare.com",
  "workers.dev",
  "www.github.com",
  "api.github.com",
  "www.google.com",
];

export function EdgeScannerPanel() {
  const { t } = useTranslation();
  const [sni, setSni] = useState("chat.openai.com");
  const [rangeMode, setRangeMode] = useState<"cloudflare" | "custom">("cloudflare");
  const [customRanges, setCustomRanges] = useState("");
  const [workers, setWorkers] = useState(50);
  const [status, setStatus] = useState<EdgeScanStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/edgescan/status"));
      if (!res.ok) return;
      const data: EdgeScanStatus = await res.json();
      setStatus({ ...data, results: Array.isArray(data.results) ? data.results : [] });
      setIsRunning(data.running);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      pollRef.current = setInterval(fetchStatus, 1200);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isRunning, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStart = async () => {
    if (!sni.trim()) {
      showToast(t("iranTools.edgeScanner.sniRequired"), "warning");
      return;
    }

    const ranges =
      rangeMode === "custom"
        ? customRanges
            .split(/[\n,]/)
            .map((r) => r.trim())
            .filter(Boolean)
        : [];

    if (rangeMode === "custom" && ranges.length === 0) {
      showToast(t("iranTools.edgeScanner.rangesRequired"), "warning");
      return;
    }

    try {
      const res = await fetch(getApiUrl("/edgescan/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sni: sni.trim(), ranges, workers }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "failed");
      }
      setIsRunning(true);
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      showToast(t("iranTools.edgeScanner.startFailed"), "error", {
        description: t("common.loadFailedHint"),
      });
      console.error("Edge scan failed:", err);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(getApiUrl("/edgescan/stop"), { method: "POST" });
      setIsRunning(false);
      if (pollRef.current) clearInterval(pollRef.current);
      fetchStatus();
    } catch {
      /* ignore */
    }
  };

  const handleCopyIp = async (ip: string) => {
    const success = await copyToClipboard(ip);
    if (success) {
      setCopiedIp(ip);
      showToast(t("dnsTab.copiedToClipboard"), "success", { description: ip });
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  const progressPct =
    status && status.total > 0 ? Math.round((status.scanned / status.total) * 100) : 0;

  const successfulResults = status?.results?.filter((r) => r.success) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ServerIcon className="w-5 h-5 text-indigo-500" />
          {t("iranTools.edgeScanner.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("iranTools.edgeScanner.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div>
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.edgeScanner.sniLabel")}
            </label>
            <InfoTooltip text={t("iranTools.edgeScanner.sniTooltip")} />
          </div>
          <input
            type="text"
            value={sni}
            onChange={(e) => setSni(e.target.value)}
            disabled={isRunning}
            dir="ltr"
            placeholder={t("iranTools.edgeScanner.sniPlaceholder")}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm text-start focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
          />
          <div className="mt-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 block">
              {t("iranTools.edgeScanner.sniPresets")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DOMAINS.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setSni(domain)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors disabled:opacity-50 font-mono ${
                    sni === domain
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.edgeScanner.rangeLabel")}
            </label>
            <InfoTooltip text={t("iranTools.edgeScanner.rangeTooltip")} />
          </div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setRangeMode("cloudflare")}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-50 ${
                rangeMode === "cloudflare"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              }`}
            >
              {t("iranTools.edgeScanner.cloudflarePreset")}
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setRangeMode("custom")}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-50 ${
                rangeMode === "custom"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              }`}
            >
              {t("iranTools.edgeScanner.customRanges")}
            </button>
          </div>
          {rangeMode === "custom" && (
            <textarea
              value={customRanges}
              onChange={(e) => setCustomRanges(e.target.value)}
              disabled={isRunning}
              dir="ltr"
              rows={4}
              placeholder={t("iranTools.edgeScanner.customRangesPlaceholder")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-mono text-start focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          )}
        </div>

        <div>
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.edgeScanner.concurrencyLabel")}: {workers}
            </label>
            <InfoTooltip text={t("iranTools.edgeScanner.concurrencyTooltip")} />
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={workers}
            disabled={isRunning}
            onChange={(e) => setWorkers(Number(e.target.value))}
            className="w-full disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-3">
          {!isRunning ? (
            <Button onClick={handleStart} className="gap-2">
              <PlayIcon className="w-4 h-4" />
              {t("iranTools.edgeScanner.startScan")}
            </Button>
          ) : (
            <Button onClick={handleStop} variant="destructive" className="gap-2">
              <StopIcon className="w-4 h-4" />
              {t("iranTools.edgeScanner.stopScan")}
            </Button>
          )}
          {status && (status.running || status.scanned > 0) && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("iranTools.edgeScanner.progress", {
                scanned: status.scanned,
                total: status.total,
                found: status.found,
              })}
            </span>
          )}
        </div>

        {status && status.total > 0 && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {successfulResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.edgeScanner.resultsTitle", { count: successfulResults.length })}
            </span>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {successfulResults.map((r) => (
              <li
                key={r.ip}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                <span dir="ltr" className="font-mono text-sm text-gray-900 dark:text-white">
                  {r.ip}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-green-600 dark:text-green-400">
                    {r.latency_ms.toFixed(0)} ms
                  </span>
                  <button
                    onClick={() => handleCopyIp(r.ip)}
                    title={t("dnsTab.copyIp")}
                    className="inline-flex items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                  >
                    {copiedIp === r.ip ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isRunning && (!status || status.total === 0) && (
        <div className="p-12 text-center border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
          <ServerIcon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">{t("iranTools.edgeScanner.noData")}</p>
        </div>
      )}

      <GuideSection title={t("iranTools.edgeScanner.guide.title")}>
        <p>{t("iranTools.edgeScanner.guide.p1")}</p>
        <p>{t("iranTools.edgeScanner.guide.p2")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("iranTools.edgeScanner.guide.li1")}</li>
          <li>{t("iranTools.edgeScanner.guide.li2")}</li>
          <li>{t("iranTools.edgeScanner.guide.li3")}</li>
          <li>{t("iranTools.edgeScanner.guide.li4")}</li>
        </ul>
      </GuideSection>
    </div>
  );
}