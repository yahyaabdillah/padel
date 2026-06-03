"use client";

import React from "react";

export type TimelineColor =
  | "primary"
  | "emerald"
  | "error"
  | "warning"
  | "info";

export interface TimelineItem {
  /** Judul aktivitas */
  title: string;
  /** Deskripsi tambahan */
  description?: string;
  /** Waktu / timestamp (string bebas) */
  time: string;
  /** Icon kustom di dalam dot (SVG/ReactNode) */
  icon?: React.ReactNode;
  /** Warna dot & aksen */
  color?: TimelineColor;
  /** Teks badge opsional di kanan judul */
  badge?: string;
}

export interface TimelineProps {
  /** Daftar item timeline (urut dari paling baru / paling atas) */
  items: TimelineItem[];
  /** Class tambahan untuk container */
  className?: string;
}

// Warna dot: pakai CSS var bila ada token, fallback Tailwind status hex
const dotColor: Record<TimelineColor, string> = {
  primary: "var(--color-primary)",
  emerald: "var(--color-emerald)",
  error: "#ef4444", // red-500
  warning: "#f59e0b", // amber-500
  info: "#06b6d4", // cyan-500
};

// Warna lembut untuk ring di sekitar dot
const dotRing: Record<TimelineColor, string> = {
  primary: "var(--color-primary-light)",
  emerald: "var(--color-emerald-light)",
  error: "rgba(239, 68, 68, 0.15)",
  warning: "rgba(245, 158, 11, 0.15)",
  info: "rgba(6, 182, 212, 0.15)",
};

/**
 * Timeline — daftar aktivitas/audit log vertikal dengan dot berwarna & garis penghubung.
 * Cocok untuk activity log gym (check-in, transaksi, perubahan data, dll).
 */
const Timeline: React.FC<TimelineProps> = ({ items, className = "" }) => {
  return (
    <ol className={["relative flex flex-col", className].join(" ")}>
      {items.map((item, index) => {
        const color = item.color ?? "primary";
        const isLast = index === items.length - 1;

        return (
          <li key={index} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Kolom dot + garis */}
            <div className="relative flex flex-col items-center">
              {/* Dot */}
              <span
                className="z-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4"
                style={{
                  backgroundColor: dotColor[color],
                  boxShadow: `0 0 0 4px ${dotRing[color]}`,
                  color: "#ffffff",
                }}
              >
                {item.icon ? (
                  <span className="flex h-4 w-4 items-center justify-center">
                    {item.icon}
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>

              {/* Garis vertikal penghubung */}
              {!isLast && (
                <span
                  className="mt-1 w-0.5 flex-1 rounded-full bg-[var(--border-default)]"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Konten */}
            <div className="flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-heading)]">
                  {item.title}
                </p>
                {item.badge && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: dotRing[color],
                      color: dotColor[color],
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 text-sm text-[var(--text-body)]">
                  {item.description}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--text-muted)]">{item.time}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default Timeline;
