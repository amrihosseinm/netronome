/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import * as authApi from "@/api/auth";

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkRegistrationStatus: () => Promise<{
    hasUsers: boolean;
    oidcConfigured: boolean;
    oidcReady: boolean;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always provide a mock user to bypass login completely
  const mockUser: User = { id: 1, username: "admin" };
  const [user, setUser] = useState<User | null>(mockUser);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // No need to check auth with backend since it is bypassed
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setUser(mockUser);
  };

  const register = async (username: string, password: string) => {
    setUser(mockUser);
  };

  const logout = async () => {
    // Empty implementation
  };

  const checkRegistrationStatus = async () => {
    return { hasUsers: true, oidcConfigured: false, oidcReady: false };
  };

  const value = {
    user,
    isAuthenticated: true,
    isLoading: false,
    login,
    register,
    logout,
    checkRegistrationStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

