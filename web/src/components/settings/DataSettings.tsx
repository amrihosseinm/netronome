/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleStackIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmationDialog } from "@/components/common/DeleteConfirmationDialog";
import { settingsApi } from "@/api/settings";
import { showToast } from "@/components/common/Toast";

export const DataSettings: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const RETENTION_OPTIONS = [
    { value: 7, label: t("settings.dataSettings.retentionOptions.days7", "older than 7 days") },
    { value: 30, label: t("settings.dataSettings.retentionOptions.days30", "older than 30 days") },
    { value: 90, label: t("settings.dataSettings.retentionOptions.days90", "older than 90 days") },
    { value: 365, label: t("settings.dataSettings.retentionOptions.year1", "older than 1 year") },
    { value: 0, label: t("settings.dataSettings.retentionOptions.everything", "everything") },
  ];
  const [olderThanDays, setOlderThanDays] = useState(30);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => settingsApi.purgeHistory(olderThanDays),
    onSuccess: (result) => {
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["history-chart"] });
      queryClient.invalidateQueries({ queryKey: ["packetloss"] });
      showToast(t("settings.dataSettings.purgedTitle", "History purged"), "success", {
        description: t(
          "settings.dataSettings.purgedDescription",
          "Deleted {{speedTests}} speedtests and {{packetLoss}} packet loss records",
          { speedTests: result.speedTests, packetLoss: result.packetLoss }
        ),
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : undefined;
      showToast(t("settings.dataSettings.purgeFailedTitle", "Failed to purge history"), "error", {
        description: message,
      });
    },
  });

  const selected = RETENTION_OPTIONS.find((o) => o.value === olderThanDays);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CircleStackIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          {t("settings.dataSettings.title", "Data Settings")}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t("settings.dataSettings.description", "Purge historic speedtest and packet loss results")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            {t("settings.dataSettings.purgeHistoryCardTitle", "Purge History")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("settings.dataSettings.deleteRecordsLabel", "Delete records")}
            </label>
            <Select
              value={String(olderThanDays)}
              onValueChange={(value) => setOlderThanDays(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder={t("settings.dataSettings.selectRetentionPlaceholder", "Select retention window")} />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("settings.dataSettings.warningText", "Permanently deletes speedtest and packet loss history. This action cannot be undone.")}
          </p>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={mutation.isPending}
            variant="destructive"
          >
            <TrashIcon className="w-4 h-4" />
            {t("settings.dataSettings.purgeButton", "Purge")}
          </Button>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => mutation.mutate()}
        title={t("settings.dataSettings.purgeHistoryCardTitle", "Purge History")}
        itemName=""
        description={
          selected?.value === 0
            ? t("settings.dataSettings.confirmDeleteAll", "Permanently delete all history? This action cannot be undone.")
            : t(
                "settings.dataSettings.confirmDeleteFiltered",
                "Permanently delete history {{label}}? This action cannot be undone.",
                { label: selected?.label }
              )
        }
        isDeleting={mutation.isPending}
      />
    </div>
  );
};
