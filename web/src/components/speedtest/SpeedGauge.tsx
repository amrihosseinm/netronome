/*
 * Copyright (c) 2024-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Circular speed gauge inspired by speedtest.net:
 * a ring of tick marks, a logarithmic scale (0-1000 Mbps),
 * a sweeping needle and the live value in the center.
 */

interface SpeedGaugeProps {
  /** Current speed in Mbps */
  value: number;
  /** Phase label shown under the value (e.g. Download / Upload) */
  label?: string;
  /** Color variant matching the current test phase */
  variant?: "download" | "upload" | "latency" | "neutral";
  /** Optional test progress 0-100 to fill the bar under the gauge */
  progress?: number;
  /** Pixel size of the gauge (square) */
  size?: number;
}

// All Tailwind classes must appear literally for JIT to generate them
const ACCENTS = {
  download: {
    text: "text-blue-500",
    stroke: "stroke-blue-500",
    fill: "fill-blue-500",
    bg: "bg-blue-500",
  },
  upload: {
    text: "text-emerald-500",
    stroke: "stroke-emerald-500",
    fill: "fill-emerald-500",
    bg: "bg-emerald-500",
  },
  latency: {
    text: "text-yellow-500",
    stroke: "stroke-yellow-500",
    fill: "fill-yellow-500",
    bg: "bg-yellow-500",
  },
  neutral: {
    text: "text-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    bg: "bg-gray-500",
  },
} as const;

// Log-scale breakpoints like speedtest.net
const SCALE_STEPS = [0, 1, 5, 10, 20, 50, 100, 250, 500, 1000];
const MAX_VALUE = 1000;

// Gauge geometry: 270° sweep starting from the bottom-left
const START_ANGLE = 135;
const SWEEP = 270;

const valueToFraction = (v: number): number => {
  const clamped = Math.max(0, Math.min(MAX_VALUE, v));
  return Math.log10(1 + clamped) / Math.log10(1 + MAX_VALUE);
};

const polarToCartesian = (
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const describeArc = (
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const formatValue = (v: number) => {
  if (v < 1) return (v * 1000).toFixed(0);
  if (v < 10) return v.toFixed(2);
  if (v < 100) return v.toFixed(1);
  return v.toFixed(0);
};

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  value,
  label,
  variant = "download",
  progress = 0,
  size = 240,
}) => {
  const accent = ACCENTS[variant];
  const fraction = valueToFraction(value);
  const needleAngle = START_ANGLE + fraction * SWEEP;

  const { ticks, minorTicks } = useMemo(() => {
    const c = size / 2;
    const outerR = size / 2 - 6;
    const tickLen = size * 0.045;

    const major = SCALE_STEPS.map((step) => {
      const angle = START_ANGLE + valueToFraction(step) * SWEEP;
      const outer = polarToCartesian(c, c, outerR, angle);
      const inner = polarToCartesian(c, c, outerR - tickLen, angle);
      const labelPos = polarToCartesian(c, c, outerR - tickLen - 12, angle);
      return { step, outer, inner, labelPos };
    });

    const minor: { outer: { x: number; y: number }; inner: { x: number; y: number } }[] = [];
    for (let i = 0; i < SCALE_STEPS.length - 1; i++) {
      const from = SCALE_STEPS[i];
      const to = SCALE_STEPS[i + 1];
      const segments = 5;
      for (let s = 1; s < segments; s++) {
        // Evenly spaced between scale steps on the log axis
        const v =
          Math.pow(
            10,
            Math.log10(1 + from) +
              ((Math.log10(1 + to) - Math.log10(1 + from)) * s) / segments
          ) - 1;
        const angle = START_ANGLE + valueToFraction(v) * SWEEP;
        minor.push({
          outer: polarToCartesian(c, c, outerR, angle),
          inner: polarToCartesian(c, c, outerR - tickLen * 0.5, angle),
        });
      }
    }

    return { ticks: major, minorTicks: minor };
  }, [size]);

  const c = size / 2;
  const outerR = size / 2 - 6;
  const arcEnd = START_ANGLE + fraction * SWEEP;

  return (
    <div className="flex flex-col items-center select-none" dir="ltr">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base ring */}
          <circle
            cx={c}
            cy={c}
            r={outerR - size * 0.01}
            fill="none"
            className="stroke-gray-200 dark:stroke-gray-800"
            strokeWidth={1.5}
          />

          {/* Minor ticks */}
          {minorTicks.map((t, i) => (
            <line
              key={`minor-${i}`}
              x1={t.outer.x}
              y1={t.outer.y}
              x2={t.inner.x}
              y2={t.inner.y}
              className="stroke-gray-300 dark:stroke-gray-700"
              strokeWidth={1}
            />
          ))}

          {/* Major ticks + scale labels */}
          {ticks.map((t) => (
            <g key={`tick-${t.step}`}>
              <line
                x1={t.outer.x}
                y1={t.outer.y}
                x2={t.inner.x}
                y2={t.inner.y}
                className="stroke-gray-400 dark:stroke-gray-600"
                strokeWidth={2}
              />
              <text
                x={t.labelPos.x}
                y={t.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-500 dark:fill-gray-400"
                style={{ fontSize: size * 0.05, fontWeight: 500 }}
              >
                {t.step}
              </text>
            </g>
          ))}

          {/* Traveled arc */}
          {fraction > 0.005 && (
            <path
              d={describeArc(c, c, outerR - size * 0.02, START_ANGLE, arcEnd)}
              fill="none"
              strokeWidth={4}
              strokeLinecap="round"
              className={accent.stroke}
              opacity={0.85}
            />
          )}

          {/* Needle */}
          <motion.g
            style={{ originX: `${c}px`, originY: `${c}px` }}
            animate={{ rotate: needleAngle }}
            transition={{ type: "spring", stiffness: 40, damping: 12 }}
          >
            <line
              x1={c}
              y1={c}
              x2={c}
              y2={c - outerR * 0.62}
              className={accent.stroke}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </motion.g>

          {/* Hub */}
          <circle cx={c} cy={c} r={size * 0.035} className={accent.fill} />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            key={formatValue(value)}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            className={cn("font-bold tabular-nums leading-none", accent.text)}
            style={{ fontSize: size * 0.17 }}
            dir="ltr"
          >
            {formatValue(value)}
          </motion.span>
          <span
            className="text-gray-500 dark:text-gray-400 font-medium mt-1"
            style={{ fontSize: size * 0.055 }}
          >
            {value < 1 ? "Kbps" : "Mbps"}
          </span>
          {label && (
            <span
              className={cn("font-semibold mt-1.5", accent.text)}
              style={{ fontSize: size * 0.06 }}
            >
              {label}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar under the gauge */}
      {progress > 0 && (
        <div className="w-2/3 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden mt-2">
          <motion.div
            className={cn("h-full rounded-full", accent.bg)}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </div>
  );
};

export default SpeedGauge;
