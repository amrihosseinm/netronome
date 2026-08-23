/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/common/Toast";
import { InfoTooltip } from "./InfoTooltip";
import { GuideSection } from "./GuideSection";

interface DomainResult {
  domain: string;
  accessible: boolean;
  status_code?: number;
  latency_ms: number;
  error?: string;
}

export function DomainCheckerPanel() {
  const { t } = useTranslation();
  const [results, setResults] = useState<DomainResult[] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [customDomains, setCustomDomains] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");

  const handleAddCustom = () => {
    const value = customInput.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!value) return;
    if (customDomains.includes(value)) {
      setCustomInput("");
      return;
    }
    setCustomDomains((prev) => [...prev, value]);
    setCustomInput("");
  };

  const handleRemoveCustom = (domain: string) => {
    setCustomDomains((prev) => prev.filter((d) => d !== domain));
  };

  const handleScan = async () => {
    setIsScanning(true);
    setResults(null);
    try {
      const res = await fetch("/api/domaincheck/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: customDomains.length > 0 ? customDomains : [] }),
      });
      if (!res.ok) throw new Error("scan failed");
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      showToast(t("iranTools.domainChecker.scanFailed"), "error");
    } finally {
      setIsScanning(false);
    }
  };

  const accessibleCount = results?.filter((r) => r.accessible).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-indigo-500" />
            {t("iranTools.domainChecker.title")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("iranTools.domainChecker.description")}
          </p>
        </div>
        <Button onClick={handleScan} disabled={isScanning} isLoading={isScanning}>
          {isScanning
            ? t("iranTools.domainChecker.scanning")
            : t("iranTools.domainChecker.scanButton")}
        </Button>
      </div>

      {/* Custom domains */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("iranTools.domainChecker.addCustomDomain")}
          </label>
          <InfoTooltip text={t("iranTools.domainChecker.customDomainTooltip")} />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
            placeholder={t("iranTools.domainChecker.customDomainPlaceholder")}
            dir="ltr"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-start"
          />
          <Button variant="outline" size="sm" onClick={handleAddCustom} className="gap-1 flex-shrink-0">
            <PlusIcon className="w-4 h-4" />
            {t("common.add")}
          </Button>
        </div>
        {customDomains.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {customDomains.map((domain) => (
              <span
                key={domain}
                dir="ltr"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
              >
                {domain}
                <button
                  onClick={() => handleRemoveCustom(domain)}
                  className="hover:text-red-500"
                  aria-label={t("common.delete")}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {customDomains.length === 0
            ? t("iranTools.domainChecker.usingDefaults")
            : t("iranTools.domainChecker.usingCustom", { count: customDomains.length })}
        </p>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.domainChecker.resultsTitle")}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("iranTools.domainChecker.summary", {
                accessible: accessibleCount,
                total: results.length,
              })}
            </span>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {results.map((r) => (
              <li
                key={r.domain}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {r.accessible ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <span dir="ltr" className="font-mono text-sm text-gray-900 dark:text-white truncate">
                    {r.domain}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                  {r.accessible ? (
                    <>
                      <span className="text-gray-400 dark:text-gray-500 font-mono">
                        {r.latency_ms.toFixed(0)} ms
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-medium">
                        {t("iranTools.domainChecker.accessible")}
                      </span>
                    </>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-medium">
                      {t("iranTools.domainChecker.blocked")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!results && !isScanning && (
        <div className="p-12 text-center border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
          <GlobeAltIcon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {t("iranTools.domainChecker.noData")}
          </p>
        </div>
      )}

      <GuideSection title={t("iranTools.domainChecker.guide.title")}>
        <p>{t("iranTools.domainChecker.guide.p1")}</p>
        <p>{t("iranTools.domainChecker.guide.p2")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("iranTools.domainChecker.guide.li1")}</li>
          <li>{t("iranTools.domainChecker.guide.li2")}</li>
          <li>{t("iranTools.domainChecker.guide.li3")}</li>
        </ul>
      </GuideSection>
    </div>
  );
}
