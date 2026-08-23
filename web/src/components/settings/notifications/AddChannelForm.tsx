/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHOUTRRR_SERVICES,
  type NotificationChannelInput,
} from "@/api/notifications";

interface AddChannelFormProps {
  onSubmit: (input: NotificationChannelInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const AddChannelForm: React.FC<AddChannelFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [url, setUrl] = useState("");
  const [showUrlHelp, setShowUrlHelp] = useState(false);

  const selectedService = SHOUTRRR_SERVICES.find((s) => s.value === service);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && url) {
      onSubmit({ name, url, enabled: true });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {t("settings.notifications.addChannelForm.channelNameLabel", "Channel Name")}
        </Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings.notifications.addChannelForm.channelNamePlaceholder", "e.g., Discord Alerts")}
          className="mt-1 w-full"
          required
        />
      </div>

      <div>
        <Label>
          {t("settings.notifications.addChannelForm.serviceTypeLabel", "Service Type")}
        </Label>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder={t("settings.notifications.addChannelForm.selectServicePlaceholder", "Select a service...")} />
          </SelectTrigger>
          <SelectContent>
            {SHOUTRRR_SERVICES.map((svc) => (
              <SelectItem key={svc.value} value={svc.value}>
                {svc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>
            {t("settings.notifications.addChannelForm.serviceUrlLabel", "Service URL")}
          </Label>
          <button
            type="button"
            onClick={() => setShowUrlHelp(!showUrlHelp)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
          >
            {showUrlHelp
              ? t("settings.notifications.addChannelForm.hideFormat", "Hide format")
              : t("settings.notifications.addChannelForm.showFormat", "Show format")}
          </button>
        </div>
        <Input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={selectedService?.example || t("settings.notifications.addChannelForm.urlPlaceholder", "service://...")}
          className="mt-1 w-full"
          required
        />
        {showUrlHelp && selectedService && (
          <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-medium">{t("settings.notifications.addChannelForm.formatLabel", "Format:")}</span>{" "}
              <code className="font-mono">{selectedService.example}</code>
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          className="flex-1"
        >
          {isLoading
            ? t("settings.notifications.addChannelForm.creatingButton", "Creating...")
            : t("settings.notifications.addChannelForm.createChannelButton", "Create Channel")}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
        >
          {t("common.cancel", "Cancel")}
        </Button>
      </div>
    </form>
  );
};
