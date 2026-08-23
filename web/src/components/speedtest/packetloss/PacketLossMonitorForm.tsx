/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PacketLossMonitor } from "@/types/types";
import {
  MonitorFormData,
  intervalOptions,
  timeOptions,
} from "./constants/packetLossConstants";
import { formatInterval } from "./utils/packetLossUtils";
import {
  ClockIcon,
  ArrowPathIcon,
  XMarkIcon as XMarkIconMini,
  ChevronDownIcon,
} from "@heroicons/react/20/solid";

interface PacketLossMonitorFormProps {
  showForm: boolean;
  onClose: () => void;
  onSubmit: (data: MonitorFormData) => void;
  editingMonitor?: PacketLossMonitor | null;
  formData: MonitorFormData;
  onFormDataChange: (data: MonitorFormData) => void;
  isLoading?: boolean;
}

export const PacketLossMonitorForm: React.FC<PacketLossMonitorFormProps> = ({
  showForm,
  onClose,
  onSubmit,
  editingMonitor,
  formData,
  onFormDataChange,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<{ host?: string; name?: string }>({});

  const validateForm = () => {
    const newErrors: { host?: string; name?: string } = {};

    if (!formData.host.trim()) {
      newErrors.host = t("packetLoss.monitorForm.hostRequired", "Host is required");
    }

    if (!formData.name.trim()) {
      newErrors.name = t("packetLoss.monitorForm.nameRequired", "Name is required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={showForm} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md bg-white dark:bg-gray-850 border dark:border-gray-900">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-gray-900 dark:text-white">
            {editingMonitor ? t("packetLoss.monitorForm.editMonitor", "Edit Monitor") : t("packetLoss.monitorForm.newMonitor", "New Monitor")}
          </DialogTitle>
        </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>{t("packetLoss.monitorForm.hostLabel", "Host")}</Label>
                      <Input
                        type="text"
                        value={formData.host}
                        onChange={(e) =>
                          onFormDataChange({
                            ...formData,
                            host: e.target.value,
                          })
                        }
                        placeholder={t("packetLoss.monitorForm.hostPlaceholder", "e.g., google.com or 8.8.8.8")}
                        className={errors.host ? "border-red-500 focus:ring-red-500/50" : ""}
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                        autoComplete="off"
                        required
                      />
                      {errors.host && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {errors.host}
                        </p>
                      )}
                      {!errors.host && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {t("packetLoss.monitorForm.icmpWarning", "Some hosts may block ICMP ping requests")}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>{t("packetLoss.monitorForm.nameLabel", "Name")}</Label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          onFormDataChange({
                            ...formData,
                            name: e.target.value,
                          })
                        }
                        placeholder={t("packetLoss.monitorForm.namePlaceholder", "e.g., Google DNS")}
                        className={errors.name ? "border-red-500 focus:ring-red-500/50" : ""}
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                        autoComplete="off"
                        required
                      />
                      {errors.name && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {errors.name}
                        </p>
                      )}
                    </div>
                    {/* Schedule Type Toggle */}
                    <div className="mb-4">
                      <Label className="mb-2">
                        {t("speedtest.scheduleManager.scheduleType", "Schedule Type")}
                      </Label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200/50 dark:bg-gray-800/30 rounded-lg">
                        <button
                          type="button"
                          onClick={() =>
                            onFormDataChange({
                              ...formData,
                              scheduleType: "interval",
                            })
                          }
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all duration-200 ${
                            formData.scheduleType === "interval"
                              ? "bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-lg transform scale-105"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                          <span>{t("speedtest.interval", "Interval")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onFormDataChange({
                              ...formData,
                              scheduleType: "exact",
                            })
                          }
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all duration-200 ${
                            formData.scheduleType === "exact"
                              ? "bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-lg transform scale-105"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          <ClockIcon className="w-4 h-4" />
                          <span>{t("speedtest.scheduleManager.exactTime", "Exact Time")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Interval or Exact Time Selector */}
                    {formData.scheduleType === "interval" ? (
                      <div>
                        <Label>{t("packetLoss.monitorForm.checkInterval", "Check Interval")}</Label>
                        <Select
                          value={formData.interval}
                          onValueChange={(value) =>
                            onFormDataChange({ ...formData, interval: value })
                          }
                        >
                          <SelectTrigger className="w-full bg-gray-200/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-900">
                            <SelectValue>
                              {intervalOptions.find(
                                (opt) => opt.value === formData.interval
                              )?.label ||
                                t("packetLoss.monitorForm.everyInterval", "Every {{interval}}", { interval: formatInterval(formData.interval) })}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {intervalOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <Label>{t("packetLoss.monitorForm.testTimes", "Test Times")}</Label>
                        <div className="space-y-3 mt-2">
                          {/* Selected Times Display */}
                          {formData.exactTimes && formData.exactTimes.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-gray-200/50 dark:bg-gray-800/30 rounded-lg border border-gray-300 dark:border-gray-900">
                              {formData.exactTimes.sort().map((time) => (
                                <div
                                  key={time}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/30"
                                >
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  <span className="text-sm font-medium">
                                    {timeOptions.find(
                                      (opt) => opt.value === time
                                    )?.label || time}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTimes = formData.exactTimes?.filter(t => t !== time) || [];
                                      onFormDataChange({
                                        ...formData,
                                        exactTimes: newTimes,
                                      });
                                    }}
                                    className="ms-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                  >
                                    <XMarkIconMini className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Time Picker with Multi-Select */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between px-4 py-2 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-900 rounded-lg text-gray-700 dark:text-gray-300 shadow-md hover:bg-gray-300/50 dark:hover:bg-gray-700/50"
                              >
                                <span>
                                  {!formData.exactTimes || formData.exactTimes.length === 0
                                    ? t("speedtest.scheduleManager.selectTimesPlaceholder", "Select times...")
                                    : formData.exactTimes.length === 1
                                      ? t("speedtest.scheduleManager.timeSelected", "{{count}} time selected", { count: formData.exactTimes.length })
                                      : t("speedtest.scheduleManager.timesSelected", "{{count}} times selected", { count: formData.exactTimes.length })}
                                </span>
                                <ChevronDownIcon className="h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="start">
                              <div className="max-h-[400px] overflow-y-auto">
                                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("packetLoss.monitorForm.selectTimesForDailyTests", "Select times for daily packet loss tests")}
                                  </p>
                                </div>
                                <div className="p-2 space-y-1">
                                  {timeOptions.map((option) => (
                                    <label
                                      key={option.value}
                                      className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={formData.exactTimes?.includes(option.value) || false}
                                        onCheckedChange={(checked) => {
                                          const currentTimes = formData.exactTimes || [];
                                          if (checked) {
                                            onFormDataChange({
                                              ...formData,
                                              exactTimes: [...currentTimes, option.value],
                                            });
                                          } else {
                                            onFormDataChange({
                                              ...formData,
                                              exactTimes: currentTimes.filter(t => t !== option.value),
                                            });
                                          }
                                        }}
                                      />
                                      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                                        {option.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                                {formData.exactTimes && formData.exactTimes.length > 0 && (
                                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onFormDataChange({
                                        ...formData,
                                        exactTimes: [],
                                      })}
                                      className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                      {t("speedtest.scheduleManager.clearAll", "Clear all")}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>{t("packetLoss.monitorForm.packetsPerTest", "Packets per Test")}</Label>
                      <Input
                        type="number"
                        value={formData.packetCount}
                        onChange={(e) =>
                          onFormDataChange({
                            ...formData,
                            packetCount: parseInt(e.target.value) || 10,
                          })
                        }
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <Label>{t("packetLoss.monitorForm.alertThreshold", "Alert Threshold (% packet loss)")}</Label>
                      <Input
                        type="number"
                        value={formData.threshold}
                        onChange={(e) =>
                          onFormDataChange({
                            ...formData,
                            threshold: parseFloat(e.target.value) || 5.0,
                          })
                        }
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enabled"
                        checked={formData.enabled}
                        onCheckedChange={(checked) =>
                          onFormDataChange({
                            ...formData,
                            enabled: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="enabled" className="cursor-pointer">
                        {t("packetLoss.monitorForm.startImmediately", "Start monitoring immediately")}
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      isLoading={isLoading}
                      variant="default"
                      className="flex-1"
                    >
                      {editingMonitor ? t("packetLoss.monitorForm.updateMonitor", "Update Monitor") : t("packetLoss.monitorForm.createMonitor", "Create Monitor")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleClose}
                      variant="secondary"
                    >
                      {t("common.cancel", "Cancel")}
                    </Button>
                  </div>
                </form>
      </DialogContent>
    </Dialog>
  );
};
