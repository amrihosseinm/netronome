/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheckIcon,
  LockOpenIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/common/Toast";
import { InfoTooltip } from "./InfoTooltip";
import { GuideSection } from "./GuideSection";

interface SniSpoofResult {
  target_domain: string;
  spoofed_sni: string;
  ip: string;
  open: boolean;
  status_code?: number;
  latency_ms: number;
  error?: string;
}

export function SniSpoofPanel() {
  const { t } = useTranslation();
  const [targetDomain, setTargetDomain] = useState("");
  const [spoofedSni, setSpoofedSni] = useState("www.google.com");
  const [ip, setIp] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<SniSpoofResult | null>(null);

  const handleCheck = async () => {
    if (!targetDomain.trim() || !spoofedSni.trim()) {
      showToast(t("iranTools.sniSpoof.fieldsRequired"), "warning");
      return;
    }
    setIsChecking(true);
    setResult(null);
    try {
      const res = await fetch("/api/snispoof/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_domain: targetDomain.trim(),
          spoofed_sni: spoofedSni.trim(),
          ip: ip.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "failed");
      }
      const data: SniSpoofResult = await res.json();
      setResult(data);
    } catch (err) {
      showToast(t("iranTools.sniSpoof.checkFailed"), "error", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
          {t("iranTools.sniSpoof.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("iranTools.sniSpoof.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div>
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.sniSpoof.targetDomainLabel")}
            </label>
            <InfoTooltip text={t("iranTools.sniSpoof.targetDomainTooltip")} />
          </div>
          <input
            type="text"
            value={targetDomain}
            onChange={(e) => setTargetDomain(e.target.value)}
            dir="ltr"
            placeholder={t("iranTools.sniSpoof.targetDomainPlaceholder")}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm text-start focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.sniSpoof.spoofedSniLabel")}
            </label>
            <InfoTooltip text={t("iranTools.sniSpoof.spoofedSniTooltip")} />
          </div>
          <input
            type="text"
            value={spoofedSni}
            onChange={(e) => setSpoofedSni(e.target.value)}
            dir="ltr"
            placeholder={t("iranTools.sniSpoof.spoofedSniPlaceholder")}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm text-start focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.sniSpoof.ipLabel")}{" "}
              <span className="text-xs text-gray-400">({t("iranTools.sniSpoof.optional")})</span>
            </label>
            <InfoTooltip text={t("iranTools.sniSpoof.ipTooltip")} />
          </div>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            dir="ltr"
            placeholder={t("iranTools.sniSpoof.ipPlaceholder")}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm text-start focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <Button onClick={handleCheck} disabled={isChecking} isLoading={isChecking}>
          {isChecking ? t("iranTools.sniSpoof.checking") : t("iranTools.sniSpoof.checkButton")}
        </Button>
      </div>

      {result && (
        <div
          className={`rounded-xl border p-5 flex items-start gap-4 ${
            result.open
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          {result.open ? (
            <LockOpenIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
          ) : (
            <LockClosedIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p
              className={`font-semibold ${
                result.open
                  ? "text-green-800 dark:text-green-300"
                  : "text-red-800 dark:text-red-300"
              }`}
            >
              {result.open
                ? t("iranTools.sniSpoof.resultOpen")
                : t("iranTools.sniSpoof.resultClosed")}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {result.open
                ? t("iranTools.sniSpoof.resultOpenDesc")
                : t("iranTools.sniSpoof.resultClosedDesc")}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-gray-400">{t("iranTools.sniSpoof.ipLabel")}</dt>
              <dd dir="ltr" className="font-mono text-gray-700 dark:text-gray-300">
                {result.ip}
              </dd>
              {result.status_code ? (
                <>
                  <dt className="text-gray-400">{t("dnsTab.status")}</dt>
                  <dd className="font-mono text-gray-700 dark:text-gray-300">
                    {result.status_code}
                  </dd>
                </>
              ) : null}
              <dt className="text-gray-400">{t("dnsTab.latency")}</dt>
              <dd className="font-mono text-gray-700 dark:text-gray-300">
                {result.latency_ms.toFixed(0)} ms
              </dd>
            </dl>
          </div>
        </div>
      )}

      <GuideSection title={t("iranTools.sniSpoof.guide.title")}>
        <p>{t("iranTools.sniSpoof.guide.p1")}</p>
        <p>{t("iranTools.sniSpoof.guide.p2")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("iranTools.sniSpoof.guide.li1")}</li>
          <li>{t("iranTools.sniSpoof.guide.li2")}</li>
          <li>{t("iranTools.sniSpoof.guide.li3")}</li>
        </ul>
      </GuideSection>
    </div>
  );
}
