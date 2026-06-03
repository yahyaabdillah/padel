"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Tone = "primary" | "success" | "warning" | "info" | "error";

const toneColor: Record<Tone, string> = {
  primary: "#6D5BFF",
  success: "#14B8A6",
  warning: "#F59E0B",
  info: "#06B6D4",
  error: "#EF4444",
};

const toneSurface: Record<Tone, string> = {
  primary: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  success: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  info: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
  error: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  trend?: number[];
  tone?: Tone;
  icon?: React.ReactNode;
  hint?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  trend,
  tone = "primary",
  icon,
  hint,
}) => {
  const color = toneColor[tone];
  const positive = (delta ?? 0) >= 0;

  const sparkOptions: ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true }, animations: { enabled: true, speed: 600 } },
    stroke: { curve: "smooth", width: 2 },
    colors: [color],
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0, stops: [0, 100] } },
    tooltip: { enabled: false },
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        {icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneSurface[tone]}`}>
            {icon}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          {delta !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                positive
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
              }`}
            >
              <svg className={`h-3 w-3 ${positive ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="truncate text-xs text-gray-400">{hint}</span>}
        </div>
        {trend && trend.length > 1 && (
          <div className="h-10 w-24 shrink-0">
            <ReactApexChart options={sparkOptions} series={[{ data: trend }]} type="area" height={40} width="100%" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
