"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import type { ChartSeries } from "./BarChart";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface RadarChartProps {
  series: ChartSeries[];
  categories: string[];
  height?: number | string;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = ["#2563eb", "#10b981", "#f59e0b"];

/** Radar / Spider chart — cocok untuk profil performa member/trainer */
const RadarChart: React.FC<RadarChartProps> = ({
  series,
  categories,
  height = 320,
  colors = DEFAULT_COLORS,
  className = "",
}) => {
  const options: ApexOptions = {
    colors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radar",
      toolbar: { show: false },
      background: "transparent",
      dropShadow: { enabled: true, blur: 6, left: 0, top: 2, opacity: 0.12, color: colors[0] },
      animations: { enabled: true, speed: 600 },
    },
    stroke: { width: 2.5, lineCap: "round" },
    fill: { opacity: 0.18 },
    markers: { size: 4, strokeWidth: 2, strokeColors: "var(--surface-card)", hover: { size: 6 } },
    xaxis: {
      categories,
      labels: { style: { colors: categories.map(() => "var(--text-caption)"), fontSize: "11px", fontFamily: "Outfit" } },
    },
    yaxis: { show: false },
    legend: {
      show: series.length > 1,
      position: "top",
      horizontalAlign: "center",
      fontFamily: "Outfit",
      fontSize: "12px",
      fontWeight: 500,
      labels: { colors: "var(--text-body)" },
      markers: { size: 6, shape: "circle", offsetX: -4 },
      itemMargin: { horizontal: 10, vertical: 4 },
    },
    plotOptions: {
      radar: {
        polygons: {
          strokeColors: "var(--border-light)",
          connectorColors: "var(--border-light)",
          fill: { colors: ["transparent"] },
        },
      },
    },
    tooltip: { theme: "dark", style: { fontFamily: "Outfit" } },
  };

  return (
    <div className={`w-full ${className}`}>
      <ReactApexChart options={options} series={series} type="radar" height={height} width="100%" />
    </div>
  );
};

export default RadarChart;
