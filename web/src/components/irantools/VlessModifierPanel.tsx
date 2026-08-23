/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyIcon, ClipboardDocumentIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/common/Toast";
import { copyToClipboard } from "@/utils/clipboard";
import { InfoTooltip } from "./InfoTooltip";
import { GuideSection } from "./GuideSection";
import { expandIPList, generateVlessConfigs, parseVlessLink } from "./vlessModifier";

export function VlessModifierPanel() {
  const { t } = useTranslation();
  const [vlessLink, setVlessLink] = useState("");
  const [ipListRaw, setIpListRaw] = useState("");
  const [generated, setGenerated] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);

  const handleGenerate = () => {
    const parsed = parseVlessLink(vlessLink);
    if (!parsed) {
      showToast(t("iranTools.vlessModifier.invalidLink"), "error");
      return;
    }

    const { ips, truncated: wasTruncated } = expandIPList(ipListRaw);
    if (ips.length === 0) {
      showToast(t("iranTools.vlessModifier.noIps"), "warning");
      return;
    }

    const configs = generateVlessConfigs(vlessLink, ips);
    setGenerated(configs);
    setTruncated(wasTruncated);
    showToast(t("iranTools.vlessModifier.generated", { count: configs.length }), "success");
  };

  const handleCopyAll = async () => {
    const success = await copyToClipboard(generated.join("\n"));
    if (success) {
      showToast(t("iranTools.vlessModifier.copiedAll"), "success");
    } else {
      showToast(t("dnsTab.copyFailed"), "error");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generated.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vless-configs.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-indigo-500" />
          {t("iranTools.vlessModifier.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("iranTools.vlessModifier.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div>
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.vlessModifier.linkLabel")}
            </label>
            <InfoTooltip text={t("iranTools.vlessModifier.linkTooltip")} />
          </div>
          <textarea
            value={vlessLink}
            onChange={(e) => setVlessLink(e.target.value)}
            dir="ltr"
            rows={3}
            placeholder="vless://uuid@example.com:443?security=tls&sni=example.com&type=ws#MyConfig"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-mono text-start focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.vlessModifier.ipsLabel")}
            </label>
            <InfoTooltip text={t("iranTools.vlessModifier.ipsTooltip")} />
          </div>
          <textarea
            value={ipListRaw}
            onChange={(e) => setIpListRaw(e.target.value)}
            dir="ltr"
            rows={4}
            placeholder={t("iranTools.vlessModifier.ipsPlaceholder")}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-mono text-start focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <Button onClick={handleGenerate}>{t("iranTools.vlessModifier.generateButton")}</Button>
      </div>

      {generated.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("iranTools.vlessModifier.resultsTitle", { count: generated.length })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
                <ClipboardDocumentIcon className="w-4 h-4" />
                {t("iranTools.vlessModifier.copyAll")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                <ArrowDownTrayIcon className="w-4 h-4" />
                {t("iranTools.vlessModifier.download")}
              </Button>
            </div>
          </div>
          {truncated && (
            <p className="px-4 pt-3 text-xs text-amber-600 dark:text-amber-400">
              {t("iranTools.vlessModifier.truncatedWarning")}
            </p>
          )}
          <textarea
            readOnly
            dir="ltr"
            value={generated.join("\n")}
            rows={Math.min(generated.length + 1, 14)}
            className="w-full px-4 py-3 text-xs font-mono text-start bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none resize-y"
          />
        </div>
      )}

      <GuideSection title={t("iranTools.vlessModifier.guide.title")}>
        <p>{t("iranTools.vlessModifier.guide.p1")}</p>
        <p>{t("iranTools.vlessModifier.guide.p2")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("iranTools.vlessModifier.guide.li1")}</li>
          <li>{t("iranTools.vlessModifier.guide.li2")}</li>
          <li>{t("iranTools.vlessModifier.guide.li3")}</li>
        </ul>
      </GuideSection>
    </div>
  );
}
