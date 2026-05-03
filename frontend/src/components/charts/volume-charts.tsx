"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import {
  CHART_COLORS,
  CHART_GRID,
  axisTick,
  tooltipStyle,
  tooltipLabelStyle,
} from "@/lib/chart-theme";

export function StackedVolumeChart({
  data,
  muscles,
}: {
  data: Array<Record<string, number | string>>;
  muscles: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data for this period.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="period"
          tick={axisTick}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={axisTick} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }} />
        {muscles.map((muscle, i) => (
          <Bar
            key={muscle}
            dataKey={muscle}
            stackId="a"
            fill={CHART_COLORS[i % CHART_COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
