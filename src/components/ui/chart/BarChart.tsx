"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type ChartSeries = { name: string; data: number[] };
type BarChartVariant = "default" | "clean";

interface BarChartProps {
  series: ChartSeries[];
  categories: string[];
  height?: number | string;
  horizontal?: boolean;
  stacked?: boolean;
  colors?: string[];
  variant?: BarChartVariant;
  columnWidth?: string;
  barRadius?: number;
  showDataLabels?: boolean;
  valueSuffix?: string;
  className?: string;
}

const DEFAULT_COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const BarChart: React.FC<BarChartProps> = ({
  series,
  categories,
  height = 300,
  horizontal = false,
  stacked = false,
  colors = DEFAULT_COLORS,
  variant = "default",
  columnWidth,
  barRadius,
  showDataLabels = false,
  valueSuffix = "",
  className = "",
}) => {
  const isClean = variant === "clean";

  const options: ApexOptions = {
    colors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      stacked,
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: true, speed: 600, animateGradually: { enabled: true, delay: 120 } },
    },
    plotOptions: {
      bar: {
        horizontal,
        columnWidth: columnWidth ?? (isClean ? "34%" : "42%"),
        borderRadius: barRadius ?? (isClean ? 10 : 8),
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
      },
    },
    dataLabels: {
      enabled: showDataLabels,
      formatter: (value) => `${Number(value).toLocaleString("id-ID")}${valueSuffix}`,
      offsetY: horizontal ? 0 : -8,
      style: { colors: ["var(--text-heading)"], fontFamily: "Outfit", fontSize: "11px", fontWeight: 700 },
    },
    stroke: { show: true, width: isClean ? 2 : 3, colors: ["transparent"] },
    fill: isClean
      ? { type: "solid", opacity: 0.92 }
      : {
          type: "gradient",
          gradient: {
            shade: "light",
            type: "vertical",
            shadeIntensity: 0.15,
            gradientToColors: colors.map((c) => c),
            opacityFrom: 1,
            opacityTo: 0.75,
            stops: [0, 100],
          },
        },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        trim: true,
        style: {
          colors: "var(--text-caption)",
          fontSize: isClean ? "12px" : "11px",
          fontFamily: "Outfit",
          fontWeight: isClean ? 600 : 400,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => `${Number(value).toLocaleString("id-ID")}${valueSuffix}`,
        style: { colors: "var(--text-caption)", fontSize: "11px", fontFamily: "Outfit" },
      },
    },
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
    grid: {
      borderColor: "var(--border-light)",
      strokeDashArray: isClean ? 3 : 5,
      padding: { left: 4, right: 4, top: showDataLabels ? 12 : 0 },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: "dark",
      style: { fontFamily: "Outfit" },
      y: { formatter: (value) => `${value.toLocaleString("id-ID")}${valueSuffix}` },
    },
    states: { hover: { filter: { type: "darken" } } },
  };

  return (
    <div className={`w-full ${className}`}>
      <ReactApexChart options={options} series={series} type="bar" height={height} width="100%" />
    </div>
  );
};

export default BarChart;
