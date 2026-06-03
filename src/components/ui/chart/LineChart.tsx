"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import type { ChartSeries } from "./BarChart";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface LineChartProps {
  series: ChartSeries[];
  categories: string[];
  height?: number | string;
  area?: boolean;
  smooth?: boolean;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b"];

const LineChart: React.FC<LineChartProps> = ({
  series,
  categories,
  height = 300,
  area = false,
  smooth = true,
  colors = DEFAULT_COLORS,
  className = "",
}) => {
  const options: ApexOptions = {
    colors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: area ? "area" : "line",
      toolbar: { show: false },
      background: "transparent",
      dropShadow: {
        enabled: true,
        top: 6,
        left: 0,
        blur: 8,
        color: colors[0],
        opacity: 0.18,
      },
      animations: { enabled: true, speed: 700 },
    },
    stroke: { curve: smooth ? "smooth" : "straight", width: 3, lineCap: "round" },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      strokeWidth: 3,
      strokeColors: "var(--surface-card)",
      hover: { size: 7 },
    },
    fill: area
      ? {
          type: "gradient",
          gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.02, stops: [0, 95] },
        }
      : { type: "solid", opacity: 1 },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "var(--text-caption)", fontSize: "11px", fontFamily: "Outfit" } },
      crosshairs: { stroke: { color: "var(--border-strong)", dashArray: 4 } },
    },
    yaxis: { labels: { style: { colors: "var(--text-caption)", fontSize: "11px", fontFamily: "Outfit" } } },
    legend: {
      show: series.length > 1,
      position: "top",
      horizontalAlign: "right",
      fontFamily: "Outfit",
      fontSize: "12px",
      fontWeight: 500,
      labels: { colors: "var(--text-body)" },
      markers: { size: 5, shape: "line", strokeWidth: 3, offsetX: -4 },
      itemMargin: { horizontal: 10, vertical: 4 },
    },
    grid: { borderColor: "var(--border-light)", strokeDashArray: 5, padding: { left: 4, right: 4 } },
    tooltip: { theme: "dark", style: { fontFamily: "Outfit" } },
  };

  return (
    <div className={`w-full ${className}`}>
      <ReactApexChart options={options} series={series} type={area ? "area" : "line"} height={height} width="100%" />
    </div>
  );
};

export default LineChart;
