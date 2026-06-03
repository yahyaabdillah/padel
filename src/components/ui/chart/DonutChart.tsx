"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DonutChartProps {
  series: number[];
  labels: string[];
  height?: number | string;
  type?: "donut" | "pie";
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const DonutChart: React.FC<DonutChartProps> = ({
  series,
  labels,
  height = 320,
  type = "donut",
  colors = DEFAULT_COLORS,
  className = "",
}) => {
  const options: ApexOptions = {
    colors,
    labels,
    chart: {
      fontFamily: "Outfit, sans-serif",
      type,
      background: "transparent",
      animations: { enabled: true, speed: 600 },
    },
    stroke: { width: 2, colors: ["var(--surface-card)"] },
    dataLabels: {
      enabled: true,
      style: { fontFamily: "Outfit", fontSize: "11px", fontWeight: 600 },
      dropShadow: { enabled: false },
    },
    legend: {
      position: "bottom",
      fontFamily: "Outfit",
      fontSize: "12px",
      fontWeight: 500,
      labels: { colors: "var(--text-body)" },
      markers: { size: 6, shape: "circle", offsetX: -4 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: "68%",
          labels: {
            show: type === "donut",
            name: { fontFamily: "Outfit", fontSize: "13px", color: "var(--text-caption)" },
            value: { fontFamily: "Outfit", fontSize: "24px", fontWeight: 700, color: "var(--text-heading)" },
            total: { show: true, label: "Total", fontFamily: "Outfit", color: "var(--text-caption)", fontSize: "12px" },
          },
        },
      },
    },
    tooltip: { theme: "dark", style: { fontFamily: "Outfit" } },
  };

  return (
    <div className={`w-full ${className}`}>
      <ReactApexChart options={options} series={series} type={type} height={height} width="100%" />
    </div>
  );
};

export default DonutChart;
