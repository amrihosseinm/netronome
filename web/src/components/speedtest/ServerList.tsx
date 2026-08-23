/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { SavedIperfServer, Server, TestProgress as TestProgressType } from "@/types/types";
import { getServers } from "@/api/speedtest";
import { SpeedGauge } from "./SpeedGauge";
import {
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { IperfServerModal } from "./IperfServerModal";
import { PersianTooltip } from "@/components/common/PersianTooltip";
import { getApiUrl } from "@/utils/baseUrl";
import { showToast } from "@/components/common/Toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDistance, useDistanceSettings } from "@/utils/distanceSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";

interface ServerListProps {
  servers: Server[];
  selectedServers: Server[];
  onSelect: (server: Server) => void;
  multiSelect: boolean;
  onMultiSelectChange: (enabled: boolean) => void;
  onRunTest: () => Promise<void>;
  isLoading: boolean;
  testType: "speedtest" | "iperf" | "librespeed";
  onTestTypeChange: (testType: "speedtest" | "iperf" | "librespeed") => void;
  isServersLoading?: boolean;
  isServersError?: boolean;
  /** Live test progress to show inline next to the Run button */
  progress?: TestProgressType | null;
  /** Nested "Advanced" section rendered inside the collapsible (e.g. Schedule Manager) */
  advancedContent?: React.ReactNode;
}

export const ServerList: React.FC<ServerListProps> = ({
  servers,
  selectedServers,
  onSelect,
  // multiSelect,
  // onMultiSelectChange,
  onRunTest,
  isLoading,
  testType,
  onTestTypeChange,
  isServersLoading,
  isServersError,
  progress,
  advancedContent,
}) => {
  const getInitialDisplayCount = () => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024 ? 6 : 3;
    }
    return 3;
  };

  const [displayCount, setDisplayCount] = useState(getInitialDisplayCount);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [customServerId, setCustomServerId] = useState("");
  const [iperfSearchTerm, setIperfSearchTerm] = useState("");
  const [addServerModalOpen, setAddServerModalOpen] = useState(false);
  const [iperfDisplayCount, setIperfDisplayCount] = useState(
    getInitialDisplayCount
  );
  const [savedIperfServers, setSavedIperfServers] = useState<
    SavedIperfServer[]
  >([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<number | null>(null);
  const [newServerDetails, setNewServerDetails] = useState<{
    host: string;
    port: string;
  }>({ host: "", port: "5201" });
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("server-list-open");
    return saved === null ? true : saved === "true";
  });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(() => {
    const saved = localStorage.getItem("advanced-schedule-open");
    return saved === "true";
  });
  const [isRefreshingServers, setIsRefreshingServers] = useState(false);
  const queryClient = useQueryClient();

  // Force a fresh server list from the backend (bypasses its cache), e.g.
  // after switching VPN location / public IP.
  const handleRefreshServers = async () => {
    if (isRefreshingServers) return;
    setIsRefreshingServers(true);
    try {
      const fresh = await getServers(testType, true);
      queryClient.setQueryData(["servers", testType], fresh);
      showToast(t("speedtest.serverList.serversRefreshed", "Server list refreshed"), "success");
    } catch (err) {
      showToast(t("speedtest.serverList.refreshFailed", "Failed to refresh server list"), "error", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsRefreshingServers(false);
    }
  };
  const { settings: distanceSettings } = useDistanceSettings();
  const { t } = useTranslation();

  // Persist server list open state to localStorage
  useEffect(() => {
    localStorage.setItem("server-list-open", isOpen.toString());
  }, [isOpen]);

  // Persist advanced (schedule) section open state to localStorage
  useEffect(() => {
    localStorage.setItem("advanced-schedule-open", isAdvancedOpen.toString());
  }, [isAdvancedOpen]);

  // Handle window resize for responsive display counts
  useEffect(() => {
    const handleResize = () => {
      const newDisplayCount = window.innerWidth >= 1024 ? 6 : 3;
      setDisplayCount(newDisplayCount);
      setIperfDisplayCount(newDisplayCount);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get unique countries for filter dropdown
  const countries = useMemo(() => {
    const uniqueCountries = new Set(servers.map((server) => server.country));
    return Array.from(uniqueCountries).sort();
  }, [servers]);


  // Filter saved iperf servers
  const filteredIperfServers = useMemo(() => {
    return savedIperfServers.filter((server) => {
      const matchesSearch =
        iperfSearchTerm === "" ||
        server.name.toLowerCase().includes(iperfSearchTerm.toLowerCase()) ||
        server.host.toLowerCase().includes(iperfSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [savedIperfServers, iperfSearchTerm]);

  const handleServerSelect = (server: Server) => {
    onSelect(server);
  };

  const handleAddCustomServer = () => {
    const id = customServerId.trim();
    if (!/^\d+$/.test(id)) {
      showToast(t("speedtest.serverList.enterNumericServerId", "Enter a numeric server ID"), "error");
      return;
    }
    if (selectedServers.some((s) => s.id === id)) {
      showToast(t("speedtest.serverList.serverAlreadyAdded", "Server already added"), "warning");
      return;
    }
    // Prefer the real server if it's in the fetched list, so display data is correct
    const existing = servers.find((s) => s.id === id);
    handleServerSelect(
      existing ?? {
        id,
        name: t("speedtest.serverList.customServerName", "Server {{id}}", { id }),
        host: `speedtest.net server ${id}`,
        location: t("speedtest.serverList.custom", "Custom"),
        distance: 0,
        country: t("speedtest.serverList.custom", "Custom"),
        sponsor: t("speedtest.serverList.customId", "Custom ID"),
        latitude: 0,
        longitude: 0,
        isIperf: false,
      }
    );
    setCustomServerId("");
  };

  // Load the saved test type when component mounts
  useEffect(() => {
    const savedTestType = localStorage.getItem("testType") as
      | "speedtest"
      | "iperf"
      | "librespeed"
      | null;
    if (savedTestType && testType !== savedTestType) {
      onTestTypeChange(savedTestType);
    }
  }, [onTestTypeChange, testType]);

  // Handle test type change
  const handleTestTypeChange = (
    newTestType: "speedtest" | "iperf" | "librespeed"
  ) => {
    // Clear selected servers when toggling
    selectedServers.forEach((server) => onSelect(server));
    // Save the new state to localStorage
    localStorage.setItem("testType", newTestType);
    onTestTypeChange(newTestType);
  };

  const fetchSavedIperfServers = async () => {
    const response = await fetch(getApiUrl("/iperf/servers"));
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || t("speedtest.serverList.failedToFetchSavedIperfServers", "Failed to fetch saved iperf servers")
      );
    }
    const data = await response.json();
    setSavedIperfServers(data);
  };

  const saveIperfServer = async (name: string, host: string, port: number) => {
    try {
      const response = await fetch(getApiUrl("/iperf/servers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, host, port }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t("speedtest.serverList.failedToSaveIperfServer", "Failed to save iperf server"));
      }

      // Refresh the list of saved servers
      await fetchSavedIperfServers();
      showToast(t("speedtest.serverList.serverAddedSuccess", 'Server "{{name}}" added successfully', { name }), "success");
    } catch (error) {
      console.error("Failed to save server:", error);
      showToast(
        error instanceof Error ? error.message : t("speedtest.serverList.failedToSaveIperfServer", "Failed to save iperf server"),
        "error"
      );
    }
  };

  const deleteSavedServer = async (id: number) => {
    try {
      const response = await fetch(getApiUrl(`/iperf/servers/${id}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t("speedtest.serverList.failedToDeleteIperfServer", "Failed to delete iperf server"));
      }

      // Refresh the list of saved servers
      await fetchSavedIperfServers();
      showToast(t("speedtest.serverList.serverDeletedSuccess", "Server deleted successfully"), "success");
    } catch (error) {
      console.error("Failed to delete server:", error);
      showToast(
        error instanceof Error ? error.message : t("speedtest.serverList.failedToDeleteIperfServer", "Failed to delete iperf server"),
        "error"
      );
    }
  };

  // Fetch saved iperf servers when component mounts or iperf mode changes
  useEffect(() => {
    if (testType === "iperf") {
      fetchSavedIperfServers().catch((error) => {
        console.error("Failed to fetch iperf servers:", error);
        showToast(t("speedtest.serverList.failedToLoadIperfServers", "Failed to load iperf servers"), "error", {
          description: error instanceof Error ? error.message : t("speedtest.serverList.unknownError", "Unknown error"),
        });
      });
    }
  }, [testType]); // Re-run when useIperf changes

  // Update filterCountry logic to handle select component values
  const filteredServersWithSelect = useMemo(() => {
    const filtered = servers.filter((server) => {
      const matchesSearch =
        searchTerm === "" ||
        server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.sponsor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.country.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCountry =
        filterCountry === "" || filterCountry === "all-countries" || server.country === filterCountry;

      return matchesSearch && matchesCountry;
    });

    return filtered.sort((a, b) => a.distance - b.distance);
  }, [servers, searchTerm, filterCountry]);

  return (
    <Collapsible
      defaultOpen={isOpen}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className="flex flex-col h-full">
        <CollapsibleTrigger
          className={`flex justify-between items-center w-full px-4 py-2 bg-gray-50/95 dark:bg-gray-850/95 ${
            isOpen ? "rounded-t-xl" : "rounded-xl"
          } shadow-lg border border-gray-200 dark:border-gray-800 ${
            isOpen ? "border-b-0" : ""
          } text-start`}
        >
          <div className="flex flex-col">
            <h2 className="text-gray-900 dark:text-white text-xl font-semibold p-1 select-none flex items-center gap-2">
              {t("speedtest.serverList.title", "Server Selection")}
              <PersianTooltip text="انتخاب سرور تست سرعت. سروری که از نظر فاصله نزدیک‌تر است را انتخاب کنید تا نتیجه تست دقیق‌تر باشد." />
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm ps-1 pb-1">
              {t("speedtest.serverList.description", "Choose between speedtest.net, iperf3 or librespeed servers")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDownIcon
              className={`${
                isOpen ? "transform rotate-180" : ""
              } w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200`}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="bg-gray-50/95 dark:bg-gray-850/95 px-4 pt-2 rounded-b-xl shadow-lg flex-1 border border-t-0 border-gray-200 dark:border-gray-800">
                <div className="flex flex-col ps-1"></div>
                <motion.div
                  className="mt-1 px-1 select-none pointer-events-none server-list-animate pb-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  onAnimationComplete={() => {
                    const element = document.querySelector(
                      ".server-list-animate"
                    );
                    if (element) {
                      element.classList.remove(
                        "select-none",
                        "pointer-events-none"
                      );
                    }
                  }}
                >
                  {/* Controls Header */}
                  <div className="flex flex-col gap-4 mb-4">
                    {/* Row 1: Test type + Run Button (+ inline gauge when running) */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* Test Type Radio Group */}
                      <RadioGroup
                        value={testType}
                        onValueChange={(value) => handleTestTypeChange(value as "speedtest" | "iperf" | "librespeed")}
                        className="flex items-center gap-2 sm:gap-4"
                      >
                        <RadioOption value="speedtest">{t("speedtest.serverList.testTypeSpeedtest", "Speedtest")}</RadioOption>
                        <RadioOption value="iperf">iperf3</RadioOption>
                        <RadioOption value="librespeed">{t("speedtest.serverList.testTypeLibrespeed", "Librespeed")}</RadioOption>
                      </RadioGroup>

                      {/* Run Button + Inline Progress Side by Side */}
                      <div className="flex items-center gap-4">
                        {/* Inline Speed Gauge - appears next to Run button while testing */}
                        <AnimatePresence mode="wait">
                          {isLoading && progress && (
                            progress.type === "download" || progress.type === "upload"
                              ? (
                                <motion.div
                                  key="inline-gauge"
                                  initial={{ opacity: 0, scale: 0.8, width: 0 }}
                                  animate={{ opacity: 1, scale: 1, width: "auto" }}
                                  exit={{ opacity: 0, scale: 0.8, width: 0 }}
                                  transition={{ duration: 0.3, ease: "easeOut" }}
                                  className="flex items-center gap-3 overflow-hidden"
                                >
                                  <SpeedGauge
                                    value={progress.currentSpeed}
                                    label={
                                      progress.type === "upload"
                                        ? t("speedtest.gauge.upload", "Upload")
                                        : t("speedtest.gauge.download", "Download")
                                    }
                                    variant={progress.type === "upload" ? "upload" : "download"}
                                    progress={progress.progress}
                                    size={110}
                                  />
                                  {progress.currentServer && (
                                    <div className="max-w-[180px] hidden sm:block">
                                      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">
                                        {progress.currentServer}
                                      </span>
                                    </div>
                                  )}
                                </motion.div>
                              )
                              : (
                                <motion.div
                                  key="inline-status"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                                >
                                  <div className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                      <motion.div
                                        key={i}
                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                      />
                                    ))}
                                  </div>
                                  <span className="whitespace-nowrap font-medium">
                                    {progress?.isLibrespeed
                                      ? t("speedtest.runningLibreSpeed", "Running LibreSpeed...")
                                      : t("speedtest.preparingTest", "Preparing test...")}
                                  </span>
                                </motion.div>
                              )
                          )}
                        </AnimatePresence>

                        {/* Run Test Button */}
                        <Button
                          onClick={onRunTest}
                          disabled={isLoading || selectedServers.length === 0}
                          className="w-full sm:w-auto shrink-0"
                        >
                          {isLoading
                            ? t("speedtest.serverList.running", "Running...")
                            : t("speedtest.serverList.run", "Run")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {testType === "iperf" && (
                    <div className="flex flex-col gap-4 mb-4">
                      {/* Search Input and Add Button for iperf3 servers */}
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="text"
                              placeholder={t("speedtest.serverList.searchSavedServers", "Search saved servers...")}
                              value={iperfSearchTerm}
                              onChange={(e) =>
                                setIperfSearchTerm(e.target.value)
                              }
                            />
                          </div>
                          <button
                            onClick={() => setAddServerModalOpen(true)}
                            className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-900 hover:border-gray-400 dark:hover:border-gray-700 shadow-md text-sm"
                            title={t("speedtest.serverList.addNewIperfServer", "Add new iperf3 server")}
                          >+ {t("common.add", "Add")}</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Server Search and Filter Controls */}
                  {(testType === "speedtest" || testType === "librespeed") && (
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      {/* Search Input + Refresh */}
                      <div className="flex-1 flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder={t("speedtest.searchServers", "Search servers...")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={handleRefreshServers}
                          disabled={isRefreshingServers}
                          title={t("speedtest.serverList.refreshServers", "Refresh server list")}
                          aria-label={t("speedtest.serverList.refreshServers", "Refresh server list")}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-900 hover:border-gray-400 dark:hover:border-gray-700 shadow-md disabled:opacity-50 flex items-center justify-center"
                        >
                          <ArrowPathIcon
                            className={`w-4 h-4 ${isRefreshingServers ? "animate-spin" : ""}`}
                          />
                        </button>
                      </div>

                      {/* Country Filter */}
                      <Select
                        value={filterCountry || "all-countries"}
                        onValueChange={(value) => setFilterCountry(value === "all-countries" ? "" : value)}
                      >
                        <SelectTrigger className="min-w-[160px]">
                          <SelectValue placeholder={t("speedtest.allCountries", "All Countries")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-countries">{t("speedtest.allCountries", "All Countries")}</SelectItem>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Add speedtest.net server by ID */}
                  {testType === "speedtest" && (
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder={t("speedtest.serverId", "Server ID")}
                          value={customServerId}
                          onChange={(e) => setCustomServerId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomServer();
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={handleAddCustomServer}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-900 hover:border-gray-400 dark:hover:border-gray-700 shadow-md text-sm"
                        title={t("speedtest.serverList.addServerByIdTitle", "Add speedtest.net server by ID")}
                      >+ {t("common.add", "Add")}</button>
                    </div>
                  )}

                  {/* Selected custom servers not present in the fetched list */}
                  {testType === "speedtest" &&
                    selectedServers.filter(
                      (s) => !servers.some((v) => v.id === s.id)
                    ).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedServers
                          .filter((s) => !servers.some((v) => v.id === s.id))
                          .map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 ps-3 pe-1.5 py-1 rounded-lg text-sm bg-blue-100/50 dark:bg-blue-500/10 border border-blue-400/50 text-blue-700 dark:text-blue-300"
                            >
                              <span>{t("speedtest.serverList.customServerLabel", "Server {{id}} (custom)", { id: s.id })}</span>
                              <button
                                onClick={() => handleServerSelect(s)}
                                className="p-0.5 rounded hover:bg-blue-200/50 dark:hover:bg-blue-500/20 transition-colors"
                                title={t("speedtest.serverList.removeServer", "Remove server")}
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                  {/* Server Grid */}
                  {testType === "iperf" ? (
                    <>
                      {filteredIperfServers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                          <div className="text-center max-w-md">
                            <div className="text-gray-600 dark:text-gray-400 text-lg mb-2">🔧</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">
                              {t("speedtest.serverList.noIperfServersFound", "No iperf3 servers found")}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                              {t("speedtest.serverList.addFirstIperfServer", "Add your first iperf3 server using the input above. Enter the server address and port (e.g., iperf.example.com:5201)")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredIperfServers
                            .slice(0, iperfDisplayCount)
                            .map((server) => {
                              const iperfServer: Server = {
                                id: `iperf3-${server.host}:${server.port}`,
                                name: server.name,
                                host: `${server.host}:${server.port}`,
                                location: t("speedtest.serverList.saved", "Saved"),
                                distance: 0,
                                country: t("speedtest.serverList.saved", "Saved"),
                                sponsor: "iperf3",
                                latitude: 0,
                                longitude: 0,
                                isIperf: true,
                              };
                              return (
                                <motion.div
                                  key={server.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div
                                    onClick={() =>
                                      handleServerSelect(iperfServer)
                                    }
                                    className={`w-full p-4 rounded-lg text-start transition-colors relative cursor-pointer ${
                                      selectedServers.some(
                                        (s) => s.id === iperfServer.id
                                      )
                                        ? "bg-blue-100/50 dark:bg-blue-500/10 border-blue-400/50 shadow-lg"
                                        : "bg-gray-100/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-900 hover:bg-gray-200/50 dark:hover:bg-gray-800 shadow-lg"
                                    } border`}
                                  >
                                    <div className="flex flex-col gap-1 pe-8">
                                      <span className="text-blue-600 dark:text-blue-300 font-medium truncate">
                                        {server.name}
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                                        {t("speedtest.serverList.iperfServerLabel", "iperf3 Server")}
                                        <span
                                          className="block truncate text-xs text-gray-500 dark:text-gray-500"
                                          title={`${server.host}:${server.port}`}
                                          dir="ltr"
                                        >
                                          {server.host}:{server.port}
                                        </span>
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                        {t("speedtest.serverList.customServer", "Custom Server")}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setServerToDelete(server.id);
                                        setDeleteModalOpen(true);
                                      }}
                                      className="absolute top-2 right-2 text-gray-600 dark:text-gray-400 p-1 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-900 rounded-md hover:bg-red-100/50 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                      title={t("speedtest.serverList.deleteServer", "Delete server")}
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      )}

                      {/* Load More Button for iperf3 */}
                      {filteredIperfServers.length > iperfDisplayCount && (
                        <div className="flex justify-center mt-6">
                          <button
                            onClick={() =>
                              setIperfDisplayCount((prev) => prev + 6)
                            }
                            className="px-4 py-2 bg-gray-200/30 dark:bg-gray-800/30 border border-gray-300/50 dark:border-gray-900/50 text-gray-600/50 dark:text-gray-300/50 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-300/50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            {t("speedtest.serverList.loadMore", "Load More")}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {filteredServersWithSelect.length === 0 &&
                      testType === "librespeed" ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                          <div className="text-center max-w-md">
                            {isServersLoading ? (
                              <>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">
                                  {t("speedtest.serverList.loadingLibrespeedServers", "Loading LibreSpeed servers...")}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                  {t("speedtest.serverList.fetchingPublicServers", "Fetching public servers from LibreSpeed.org.")}
                                </p>
                              </>
                            ) : isServersError ? (
                              <>
                                <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
                                  {t("speedtest.failedToLoad", "Failed to load servers")}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                  {t("speedtest.serverList.couldNotFetchLibrespeed", "Could not fetch LibreSpeed servers. Check your network connection or add custom servers via librespeed-servers.json.")}
                                </p>
                              </>
                            ) : (
                              <>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">
                                  {t("speedtest.serverList.noLibrespeedServersFound", "No LibreSpeed servers found")}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                  {t("speedtest.serverList.noServersMatchedSearch", "No servers matched your search. Try adjusting your filters or add custom servers via librespeed-servers.json.")}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredServersWithSelect
                            .slice(0, displayCount)
                            .map((server) => (
                                <motion.div
                                  key={server.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <button
                                    onClick={() => handleServerSelect(server)}
                                    className={`w-full p-4 rounded-lg text-start transition-colors ${
                                      selectedServers.some(
                                        (s) => s.id === server.id
                                      )
                                        ? "bg-blue-100/50 dark:bg-blue-500/10 border-blue-400/50 shadow-lg"
                                        : "bg-gray-100/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-900 hover:bg-gray-200/50 dark:hover:bg-gray-800 shadow-lg"
                                    } border`}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-blue-600 dark:text-blue-300 font-medium truncate">
                                          {server.sponsor}
                                        </span>
                                        {server.isLibrespeed && (
                                          <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                              server.isPublic
                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                            }`}
                                          >
                                            {server.isPublic ? t("speedtest.serverList.public", "Public") : t("speedtest.serverList.custom", "Custom")}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                                        {server.name}
                                        <span
                                          className="block truncate text-xs text-gray-500 dark:text-gray-500"
                                          title={server.host}
                                        >
                                          {server.host}
                                        </span>
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                        {server.country} -{" "}
                                        {formatDistance(server.distance, distanceSettings)}
                                      </span>
                                    </div>
                                  </button>
                                </motion.div>
                              ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Load More Button */}
                  {testType !== "iperf" &&
                    filteredServersWithSelect.length > displayCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={() => setDisplayCount((prev) => prev + 6)}
                          className="px-4 py-2 bg-gray-200/30 dark:bg-gray-800/30 border border-gray-300/50 dark:border-gray-900/50 text-gray-600/50 dark:text-gray-300/50 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-300/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          {t("speedtest.serverList.loadMore", "Load More")}
                        </button>
                      </div>
                    )}

                  {/* Advanced: nested automation section (Schedule Manager) */}
                  {advancedContent && (
                    <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-900/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsAdvancedOpen((prev) => !prev)}
                        className="flex justify-between items-center w-full px-4 py-2.5 text-start cursor-pointer"
                      >
                        <span className="flex flex-col">
                          <span className="text-gray-900 dark:text-white text-base font-semibold select-none flex items-center gap-2">
                            {t("speedtest.serverList.advancedSchedule", "Advanced: Schedule Manager")}
                            <PersianTooltip text="اجرای خودکار تست‌های سرعت در بازه‌های زمانی مشخص یا زمان‌های دقیق." />
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 text-xs select-none">
                            {t("speedtest.serverList.advancedScheduleDescription", "Automate tests at regular intervals or specific times")}
                          </span>
                        </span>
                        <ChevronDownIcon
                          className={`${
                            isAdvancedOpen ? "transform rotate-180" : ""
                          } w-5 h-5 flex-shrink-0 text-gray-600 dark:text-gray-400 transition-transform duration-200`}
                        />
                      </button>
                      {isAdvancedOpen && (
                        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800">
                          {advancedContent}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
          </div>
        </CollapsibleContent>
        <IperfServerModal
              isOpen={deleteModalOpen}
              onClose={() => {
                setDeleteModalOpen(false);
                setServerToDelete(null);
              }}
              onConfirm={() => {
                if (serverToDelete) {
                  deleteSavedServer(serverToDelete);
                }
              }}
              title={t("speedtest.serverList.deleteServerTitle", "Delete Server")}
              message={t("speedtest.serverList.deleteServerMessage", "Are you sure you want to delete this server? This action cannot be undone.")}
              confirmText={t("common.delete", "Delete")}
              confirmStyle="danger"
            />

            <IperfServerModal
              isOpen={saveModalOpen}
              onClose={() => {
                setSaveModalOpen(false);
                setNewServerDetails({ host: "", port: "5201" });
              }}
              onConfirm={(name) => {
                if (name && newServerDetails.host) {
                  saveIperfServer(
                    name,
                    newServerDetails.host,
                    parseInt(newServerDetails.port)
                  );
                }
              }}
              title={t("speedtest.serverList.saveServerTitle", "Save Server")}
              message={t("speedtest.serverList.saveServerMessage", "Enter a name for this iperf server")}
              confirmText={t("common.save", "Save")}
              serverDetails={newServerDetails}
            />

            <AddServerModal
              isOpen={addServerModalOpen}
              onClose={() => setAddServerModalOpen(false)}
              onConfirm={(name, host, port) => {
                saveIperfServer(name, host, parseInt(port));
              }}
            />
      </div>
    </Collapsible>
  );
};

const RadioOption: React.FC<{
  value: "speedtest" | "iperf" | "librespeed";
  children: React.ReactNode;
}> = ({ value, children }) => (
  <div className="flex items-center gap-2">
    <RadioGroupItem value={value} id={value} />
    <Label
      htmlFor={value}
      className="cursor-pointer px-3 py-1 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-800 text-xs sm:text-sm text-gray-600 dark:text-gray-400"
    >
      {children}
    </Label>
  </div>
);

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, host: string, port: string) => void;
}

const AddServerModal: React.FC<AddServerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [serverName, setServerName] = useState("");
  const [serverHost, setServerHost] = useState("");
  const [serverPort, setServerPort] = useState("5201");

  const handleClose = () => {
    setServerName("");
    setServerHost("");
    setServerPort("5201");
    onClose();
  };

  const handleConfirm = () => {
    if (serverName.trim() && serverHost.trim()) {
      onConfirm(serverName.trim(), serverHost.trim(), serverPort.trim());
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>{t("speedtest.serverList.addIperfServerTitle", "Add iperf3 Server")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverName">
              {t("speedtest.serverName", "Server Name")}
            </Label>
            <Input
              type="text"
              id="serverName"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder={t("speedtest.iperfServerModal.namePlaceholder", "Enter a name for this server")}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serverHost">
              {t("speedtest.serverHost", "Server Host")}
            </Label>
            <Input
              type="text"
              id="serverHost"
              value={serverHost}
              onChange={(e) => setServerHost(e.target.value)}
              placeholder="iperf.example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serverPort">
              {t("speedtest.serverPort", "Server Port")}
            </Label>
            <Input
              type="number"
              id="serverPort"
              value={serverPort}
              onChange={(e) => setServerPort(e.target.value)}
              placeholder="5201"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            type="button"
            disabled={!serverName.trim() || !serverHost.trim()}
            onClick={handleConfirm}
          >
            {t("speedtest.addServer", "Add Server")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
