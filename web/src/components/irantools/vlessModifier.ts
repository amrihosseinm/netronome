/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const MAX_GENERATED_CONFIGS = 500;

// Matches vless://<userinfo>@<host>:<port>?<query>#<fragment>
const VLESS_REGEX = /^vless:\/\/([^@]+)@([^:@]+):(\d+)(\?[^#]*)?(#.*)?$/i;

export interface ParsedVless {
  userinfo: string;
  host: string;
  port: string;
  query: string;
  fragment: string;
}

export function parseVlessLink(link: string): ParsedVless | null {
  const trimmed = link.trim();
  const match = VLESS_REGEX.exec(trimmed);
  if (!match) return null;

  const [, userinfo, host, port, query = "", fragment = ""] = match;
  return { userinfo, host, port, query, fragment };
}

export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

function incIPv4(parts: number[]): boolean {
  for (let i = 3; i >= 0; i--) {
    parts[i]++;
    if (parts[i] <= 255) return true;
    parts[i] = 0;
  }
  return false; // overflowed
}

/**
 * Expands a list of raw entries (single IPv4 addresses or IPv4 CIDR ranges)
 * into a flat, capped list of IP address strings.
 */
export function expandIPList(raw: string): { ips: string[]; truncated: boolean } {
  const entries = raw
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter(Boolean);

  const ips: string[] = [];
  let truncated = false;
  const seen = new Set<string>();

  for (const entry of entries) {
    if (ips.length >= MAX_GENERATED_CONFIGS) {
      truncated = true;
      break;
    }

    if (entry.includes("/")) {
      const [base, prefixStr] = entry.split("/");
      const prefix = Number(prefixStr);
      if (!isValidIPv4(base) || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
        continue;
      }
      const hostBits = 32 - prefix;
      const count = Math.min(2 ** hostBits, MAX_GENERATED_CONFIGS - ips.length);
      const parts = base.split(".").map(Number);
      for (let i = 0; i < count; i++) {
        const ipStr = parts.join(".");
        if (!seen.has(ipStr)) {
          seen.add(ipStr);
          ips.push(ipStr);
        }
        if (!incIPv4(parts)) break;
      }
      if (2 ** hostBits > count) truncated = true;
      continue;
    }

    if (isValidIPv4(entry)) {
      if (!seen.has(entry)) {
        seen.add(entry);
        ips.push(entry);
      }
    }
  }

  return { ips, truncated };
}

/**
 * Given an original vless:// link and a list of replacement IPs, generates
 * one new vless link per IP with the connection host swapped out. The
 * original host/SNI information in the query string (if present) is left
 * untouched so TLS/SNI-based routing keeps working.
 */
export function generateVlessConfigs(originalLink: string, ips: string[]): string[] {
  const parsed = parseVlessLink(originalLink);
  if (!parsed) return [];

  return ips.map((ip) => {
    const remark = parsed.fragment ? decodeURIComponent(parsed.fragment.slice(1)) : "";
    const newFragment = `#${encodeURIComponent(remark ? `${remark}-${ip}` : ip)}`;
    return `vless://${parsed.userinfo}@${ip}:${parsed.port}${parsed.query}${newFragment}`;
  });
}
