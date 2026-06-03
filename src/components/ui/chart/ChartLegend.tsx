"use client";

import React from "react";

export type LegendItem = {
  label: string;
  color: string;
  value?: string | number;
};

interface ChartLegendProps {
  items: LegendItem[];
  /** bentuk marker: pill (default, memanjang), dot, ring */
  marker?: "pill" | "dot" | "ring";
  align?: "left" | "center" | "right";
  className?: string;
}

const alignMap = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

/** Legend kustom untuk chart — marker pill/ring yang lebih menarik dari kotak/circle biasa */
const ChartLegend: React.FC<ChartLegendProps> = ({
  items,
  marker = "pill",
  align = "left",
  className = "",
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${alignMap[align]} ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          {marker === "pill" && (
            <span className="h-2 w-4 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}55` }} />
          )}
          {marker === "dot" && (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          )}
          {marker === "ring" && (
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: item.color }} />
          )}
          <span className="text-xs font-medium text-[var(--text-caption)]">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-xs font-bold text-[var(--text-heading)] tabular-nums">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChartLegend;
