/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useTranslation } from "react-i18next";
import {
  GlobeAltIcon,
  ServerIcon,
  ShieldCheckIcon,
  KeyIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DomainCheckerPanel } from "./DomainCheckerPanel";
import { EdgeScannerPanel } from "./EdgeScannerPanel";
import { SniSpoofPanel } from "./SniSpoofPanel";
import { VlessModifierPanel } from "./VlessModifierPanel";
import { ProtocolCheckerPanel } from "./ProtocolCheckerPanel";

export function IranToolsTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("iranTools.title")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("iranTools.description")}
        </p>
      </div>

      <Tabs defaultValue="protocolChecker">
        <TabsList className="flex-wrap">
          <TabsTrigger value="protocolChecker" className="gap-1.5">
            <SignalIcon className="w-4 h-4" />
            {t("iranTools.tabs.protocolChecker")}
          </TabsTrigger>
          <TabsTrigger value="domainChecker" className="gap-1.5">
            <GlobeAltIcon className="w-4 h-4" />
            {t("iranTools.tabs.domainChecker")}
          </TabsTrigger>
          <TabsTrigger value="edgeScanner" className="gap-1.5">
            <ServerIcon className="w-4 h-4" />
            {t("iranTools.tabs.edgeScanner")}
          </TabsTrigger>
          <TabsTrigger value="sniSpoof" className="gap-1.5">
            <ShieldCheckIcon className="w-4 h-4" />
            {t("iranTools.tabs.sniSpoof")}
          </TabsTrigger>
          <TabsTrigger value="vlessModifier" className="gap-1.5">
            <KeyIcon className="w-4 h-4" />
            {t("iranTools.tabs.vlessModifier")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="protocolChecker" className="pt-4">
          <ProtocolCheckerPanel />
        </TabsContent>
        <TabsContent value="domainChecker" className="pt-4">
          <DomainCheckerPanel />
        </TabsContent>
        <TabsContent value="edgeScanner" className="pt-4">
          <EdgeScannerPanel />
        </TabsContent>
        <TabsContent value="sniSpoof" className="pt-4">
          <SniSpoofPanel />
        </TabsContent>
        <TabsContent value="vlessModifier" className="pt-4">
          <VlessModifierPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
