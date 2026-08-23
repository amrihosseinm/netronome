/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useEffect, useState, useCallback } from "react";
import { Outlet } from "@tanstack/react-router";
import { ArrowRightStartOnRectangleIcon as LogoutIcon } from "@heroicons/react/24/outline";
import {
  Bars3Icon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import {
  initializeDarkMode,
  getCurrentThemeMode,
  setAutoTheme,
  getSystemTheme,
} from "@/utils/darkMode";
import { useAuth } from "@/context/auth";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { SettingsMenu } from "@/components/SettingsMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { Button } from "@/components/ui/Button";
import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logo from "@/assets/logo_small.png";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { useTranslation } from "react-i18next";

function App() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] =
    useState(false);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark" | "auto">(
    getCurrentThemeMode()
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    initializeDarkMode();

    // Listen for theme changes from other sources (like desktop toggle)
    const handleThemeChangeEvent = () => {
      setCurrentTheme(getCurrentThemeMode());
    };

    window.addEventListener("themechange", handleThemeChangeEvent);
    return () => {
      window.removeEventListener("themechange", handleThemeChangeEvent);
    };
  }, []);

  const handleThemeChange = useCallback((theme: "light" | "dark" | "auto") => {
    if (theme === "auto") {
      setAutoTheme();
    } else if (theme === "light") {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    } else {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    }
    setCurrentTheme(theme);

    // Dispatch event to notify other components
    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: {
          theme: theme === "auto" ? getSystemTheme() : theme,
          isSystemChange: false,
        },
      })
    );
  }, []);

  const getThemeIcon = (theme: "light" | "dark" | "auto") => {
    switch (theme) {
      case "light":
        return <SunIcon className="h-5 w-5" />;
      case "dark":
        return <MoonIcon className="h-5 w-5" />;
      case "auto":
        return <ComputerDesktopIcon className="h-5 w-5" />;
    }
  };

  // Check if we're on the public route
  const isPublicRoute = window.location.pathname.includes("/public");
  const showHeader = isAuthenticated || isPublicRoute;

  return (
    <div className="min-h-screen bg-white pattern dark:bg-gray-900 relative transition-colors duration-300 ease-in-out">
      {/* Show header for authenticated users OR public route */}
      {showHeader && (
        <>
          {/* Logo in upper left - more compact on mobile */}
          <div className="absolute z-10 top-3 sm:top-4 start-3 sm:start-4 flex items-center gap-2 sm:gap-3 app-header-logo">
            <img
              src={logo}
              alt="netronome Logo"
              className="h-10 w-10 sm:h-12 sm:w-12 select-none pointer-events-none"
              draggable="false"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white select-none">
                Netronome
              </h1>
              <h2 className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 select-none">
                {t("app.tagline", "Network Performance Testing")}
              </h2>
            </div>
          </div>
        </>
      )}

      {/* Only show controls for authenticated users */}
      {isAuthenticated && (
        <>
          {/* Desktop controls */}
          <div className="hidden sm:flex absolute z-10 top-4 end-4 items-center gap-2">
            <Button
              onClick={() => window.dispatchEvent(new Event('start-persian-tour'))}
              variant="outline"
              size="sm"
              className="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {t("app.persianGuide", "راهنمای فارسی")} 🇮🇷
            </Button>
            <LanguageSelector />
            <DarkModeToggle />
            <SettingsMenu />
            <Button
              onClick={() => logout()}
              variant="ghost"
              size="icon"
              className="text-gray-600 dark:text-gray-600 hover:text-gray-900 dark:hover:text-blue-400"
              aria-label={t("app.logout", "Logout")}
            >
              <LogoutIcon className="h-6 w-6" />
            </Button>
          </div>

          {/* Mobile hamburger menu */}
          <div className="sm:hidden absolute z-10 top-3 end-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  aria-label={t("app.openMenu", "Open menu")}
                >
                  <Bars3Icon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side={document.documentElement.dir === 'rtl' ? 'left' : 'right'}
                className="w-72 bg-white dark:bg-gray-900 border-s border-gray-200 dark:border-gray-800"
              >
                <div className="flex flex-col h-full">
                  <SheetHeader className="pb-6 border-b border-gray-200 dark:border-gray-800">
                    <SheetTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("app.settings", "Settings")}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="flex-1 py-6">
                    <div className="space-y-2">
                      {/* Persian Tour Mobile */}
                      <Button
                        onClick={() => {
                          window.dispatchEvent(new Event('start-persian-tour'));
                          setMobileMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start gap-3 h-auto px-4 py-3"
                      >
                        <span className="text-xl flex-shrink-0">🇮🇷</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("app.persianGuide", "راهنمای فارسی")}
                        </span>
                      </Button>

                      {/* Theme Selection */}
                      <div className="px-4 py-3">
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                          {t("app.theme", "Theme")}
                        </h3>
                        <div className="space-y-2">
                          {(["light", "dark", "auto"] as const).map((theme) => (
                            <Button
                              key={theme}
                              onClick={() => handleThemeChange(theme)}
                              variant="ghost"
                              className={`w-full justify-start gap-3 h-auto px-3 py-2 ${
                                currentTheme === theme
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 flex items-center justify-center ${
                                  currentTheme === theme
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400"
                                }`}
                              >
                                {getThemeIcon(theme)}
                              </div>
                              <span className="text-sm font-medium capitalize">
                                {theme === "auto"
                                  ? t("app.themeSystem", "System")
                                  : theme === "light"
                                  ? t("app.themeLight", "Light")
                                  : t("app.themeDark", "Dark")}
                              </span>
                              {currentTheme === theme && (
                                  <svg
                                    className="w-4 h-4 ms-auto text-blue-600 dark:text-blue-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Notifications */}
                      <Button
                        onClick={() => {
                          setIsNotificationSettingsOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start gap-3 h-auto px-4 py-3"
                      >
                        <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("app.notifications", "Notifications")}
                        </span>
                        <svg
                          className="w-4 h-4 ms-auto text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </>
      )}

      {/* Notification Settings Dialog */}
      <Dialog
        open={isNotificationSettingsOpen}
        onOpenChange={setIsNotificationSettingsOpen}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] sm:w-full sm:max-w-3xl md:max-w-5xl lg:max-w-6xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl !p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-800">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("app.notificationSettings", "Notification Settings")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-0 sm:p-6 lg:p-8 max-h-[70vh] overflow-y-auto modal-scrollbar">
            <NotificationSettings />
          </div>
        </DialogContent>
      </Dialog>

      <Outlet />
      <Toaster position="bottom-right" />
      <PWAUpdatePrompt />
    </div>
  );
}

export default App;
