"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  CHART_COLORS,
  CHART_GRID,
  axisTick,
  tooltipStyle,
  tooltipLabelStyle,
} from "@/lib/chart-theme";

export function VolumeBarChart({
  data,
  muscles,
}: {
  data: Array<Record<string, number | string>>;
  muscles: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        No volume data yet. Import your training history to see this chart.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="period"
          tick={axisTick}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={axisTick} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
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

export function BodyWeightLineChart({
  data,
}: {
  data: Array<{ date: string; weight: number | null }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        No weight data yet. Import MacroFactor data or log sessions with body weight.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="date"
          tick={axisTick}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={axisTick} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
