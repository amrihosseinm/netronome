/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ServerTypeOption {
  value: string;
  label: string;
  labelKey?: string;
}

interface ServerFiltersProps {
  searchTerm: string;
  filterType: string;
  serverTypeOptions: ServerTypeOption[];
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: string) => void;
  disabled?: boolean;
}

export const ServerFilters: React.FC<ServerFiltersProps> = ({
  searchTerm,
  filterType,
  serverTypeOptions,
  onSearchChange,
  onFilterTypeChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const resolveLabel = (option: ServerTypeOption) =>
    option.labelKey ? t(option.labelKey, option.label) : option.label;
  const selectedType = serverTypeOptions.find(
    (type) => type.value === filterType
  );
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4">
      {/* Search Input */}
      <div className="flex-1">
        <Input
          type="text"
          placeholder={t("traceroute.searchServers", "Search servers...")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Server Type Filter */}
      <Select
        value={filterType}
        onValueChange={onFilterTypeChange}
        disabled={disabled}
      >
        <SelectTrigger className="min-w-[160px]">
          <SelectValue>
            {selectedType
              ? resolveLabel(selectedType)
              : t("traceroute.allTypes", "All Types")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {serverTypeOptions.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {resolveLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
