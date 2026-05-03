"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

import {
  CHART_COLORS,
  CHART_GRID,
  axisTick,
  tooltipStyle,
  tooltipLabelStyle,
} from "@/lib/chart-theme";

export function FrequencyBarChart({
  data,
  avg,
}: {
  data: Array<{ week: string; sessions: number }>;
  avg: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="week"
          tick={{ ...axisTick, fontSize: 10 }}
          tickFormatter={(v: string) => v.slice(5)}
          interval={Math.max(1, Math.floor(data.length / 10))}
        />
        <YAxis tick={axisTick} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <ReferenceLine
          y={avg}
          stroke={CHART_COLORS[0]}
          strokeDasharray="4 2"
          label={{ value: `Avg: ${avg}`, fill: CHART_COLORS[0], fontSize: 11 }}
        />
        <Bar dataKey="sessions" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
