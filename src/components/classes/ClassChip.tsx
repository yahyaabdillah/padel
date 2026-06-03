"use client";

import React from "react";
import { coachById, type ManagedClass } from "@/data/padel/engage/classes";

/* Compact schedule chip used in the weekly grid. Pure presentational; click
 * opens the manage menu in the page. */

interface ClassChipProps {
  cls: ManagedClass;
  onClick: () => void;
}

const ClassChip: React.FC<ClassChipProps> = ({ cls, onClick }) => {
  const coach = coachById(cls.coachId);
  const full = cls.enrolled >= cls.capacity;
  const cancelled = cls.status === "cancelled";

  return (
    <button
      onClick={onClick}
      className={[
        "group w-full rounded-xl border-l-4 bg-[var(--surface-card)] p-2.5 text-left shadow-theme-xs transition-all hover:-translate-y-0.5 hover:shadow-theme-md",
        cancelled ? "opacity-55" : "",
      ].join(" ")}
      style={{ borderLeftColor: cancelled ? "#94A3B8" : cls.color }}
    >
      <p
        className={[
          "truncate text-xs font-semibold text-[var(--text-heading)]",
          cancelled ? "line-through" : "",
        ].join(" ")}
      >
        {cls.title}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--text-caption)]">
        {cls.startTime}–{cls.endTime}
      </p>
      <p className="text-[11px] text-[var(--text-muted)]">
        {coach?.name.split(" ")[0]} · {cls.court}
      </p>
      <div className="mt-1.5 flex items-center justify-between">
        {cancelled ? (
          <span className="text-[10px] font-semibold text-[var(--text-muted)]">
            Cancelled
          </span>
        ) : (
          <span
            className={`text-[10px] font-semibold ${full ? "text-rose-500" : "text-emerald-500"}`}
          >
            {cls.enrolled}/{cls.capacity} {full ? "full" : "open"}
          </span>
        )}
      </div>
    </button>
  );
};

export default ClassChip;
