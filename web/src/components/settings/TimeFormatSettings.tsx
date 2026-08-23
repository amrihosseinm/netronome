/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClockIcon, GlobeAltIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  getTimeFormatSettings, 
  saveTimeFormatSettings, 
  TIMEZONE_OPTIONS,
  getBrowserTimezone,
  getTimezoneDisplayName,
  getTimeFormatExample,
  formatDateTimeWithSettings,
  type TimeFormatSettings as TimeSettings
} from "@/utils/timeSettings";
import { showToast } from "@/components/common/Toast";

export const TimeFormatSettings: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<TimeSettings>(getTimeFormatSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = (key: keyof TimeSettings, value: string | boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const saveSettings = () => {
    saveTimeFormatSettings(settings);
    setHasChanges(false);
    showToast(t("settings.timeFormat.savedTitle", "Time format settings saved"), "success", {
      description: t("settings.timeFormat.savedDescription", "Changes will be applied across the application")
    });
  };

  const resetToDefaults = () => {
    const defaultSettings: TimeSettings = {
      timezone: "auto",
      use24HourFormat: false,
    };
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const currentTimezone = settings.timezone === "auto" ? getBrowserTimezone() : settings.timezone;
  const timezoneDisplayName = getTimezoneDisplayName(settings.timezone);
  const timeExample = getTimeFormatExample(settings);
  const now = new Date();
  const dateTimeExample = formatDateTimeWithSettings(now, settings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            {t("settings.timeFormat.title", "Time & Date Settings")}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("settings.timeFormat.description", "Configure timezone and time format preferences for the application")}
          </p>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={saveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckIcon className="w-4 h-4" />
              {t("common.saveChanges", "Save Changes")}
            </Button>
            <Button 
              onClick={() => {
                setSettings(getTimeFormatSettings());
                setHasChanges(false);
              }}
              variant="secondary"
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timezone Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GlobeAltIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t("settings.timeFormat.timezoneCardTitle", "Timezone")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("settings.timeFormat.selectTimezoneLabel", "Select Timezone")}
              </label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSetting("timezone", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {timezoneDisplayName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="auto">
                    <div className="flex items-center justify-between w-full">
                      <span>{t("settings.timeFormat.autoTimezoneLabel", "Auto (Browser Timezone)")}</span>
                      <Badge variant="secondary" className="ms-2">{t("settings.timeFormat.recommendedBadge", "Recommended")}</Badge>
                    </div>
                  </SelectItem>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{tz.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ms-2">
                          {tz.offset}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-start gap-2">
                <GlobeAltIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900 dark:text-blue-300">
                    {t("settings.timeFormat.currentTimezoneLabel", "Current Timezone: {{timezone}}", { timezone: currentTimezone })}
                  </div>
                  <div className="text-blue-700 dark:text-blue-400 mt-1">
                    {t("settings.timeFormat.timezoneExplanation", "All dates and times will be displayed in this timezone.")}
                    {settings.timezone === "auto" && (
                      <span className="block mt-1 text-xs">
                        {t("settings.timeFormat.autoDetectionNote", "Using browser detection. This will adapt automatically to your system timezone changes.")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Format Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              {t("settings.timeFormat.timeFormatCardTitle", "Time Format")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("settings.timeFormat.use24HourLabel", "24-Hour Format")}
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t("settings.timeFormat.use24HourDescription", "Use 24-hour clock instead of 12-hour with AM/PM")}
                </p>
              </div>
              <Switch
                checked={settings.use24HourFormat}
                onCheckedChange={(checked) => updateSetting("use24HourFormat", checked)}
              />
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="flex items-start gap-2">
                <ClockIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-green-900 dark:text-green-300">
                    {t("settings.timeFormat.previewLabel", "Preview")}
                  </div>
                  <div className="text-green-700 dark:text-green-400 mt-1 space-y-1">
                    <div>{t("settings.timeFormat.timeLabel", "Time:")} <span className="font-mono">{timeExample}</span></div>
                    <div>{t("settings.timeFormat.fullLabel", "Full:")} <span className="font-mono">{dateTimeExample}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400">
              <strong>{t("settings.timeFormat.noteLabel", "Note:")}</strong> {t("settings.timeFormat.noteIntro", "These settings affect how times are displayed in:")}
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{t("settings.timeFormat.noteItems.speedtestCharts", "Speed test history charts and tooltips")}</li>
                <li>{t("settings.timeFormat.noteItems.scheduleManager", "Schedule manager and next run times")}</li>
                <li>{t("settings.timeFormat.noteItems.monitorCharts", "Monitor bandwidth charts")}</li>
                <li>{t("settings.timeFormat.noteItems.notificationTimestamps", "Notification timestamps")}</li>
                <li>{t("settings.timeFormat.noteItems.allOtherDisplays", "All other time displays throughout the application")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {t("settings.timeFormat.quickActionsTitle", "Quick Actions")}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t("settings.timeFormat.quickActionsDescription", "Reset settings or apply common configurations")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={resetToDefaults}
                variant="outline"
              >
                {t("settings.timeFormat.resetToDefaults", "Reset to Defaults")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
