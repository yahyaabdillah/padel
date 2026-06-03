"use client";

import React from "react";
import BarChart from "@/components/ui/chart/BarChart";

interface PeakHoursChartProps {
  /** 16 values, one per operating hour 07..22 */
  data: number[];
}

const hourLabels = Array.from({ length: 16 }, (_, i) => {
  const h = i + 7;
  return `${String(h).padStart(2, "0")}`;
});

const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data }) => (
  <BarChart
    series={[{ name: "Bookings", data }]}
    categories={hourLabels}
    colors={["#6D5BFF"]}
    height={260}
  />
);

export default PeakHoursChart;
