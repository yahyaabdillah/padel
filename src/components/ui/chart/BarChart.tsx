"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type ChartSeries = { name: string; data: number[] };

interface BarChartProps {
  series: ChartSeries[];
  categories: string[];
  height?: number | string;
  horizontal?: boolean;
  stacked?: boolean;
  colors?: string[];
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
  className = "",
}) => {
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
      bar: { horizontal, columnWidth: "42%", borderRadius: 8, borderRadiusApplication: "end", borderRadiusWhenStacked: "last" },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    fill: {
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
      labels: { style: { colors: "var(--text-caption)", fontSize: "11px", fontFamily: "Outfit" } },
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
    states: { hover: { filter: { type: "darken" } } },
  };

  return (
    <div className={`w-full ${className}`}>
      <ReactApexChart options={options} series={series} type="bar" height={height} width="100%" />
    </div>
  );
};

export default BarChart;
