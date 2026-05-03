"use client";

import {
  LineChart,
  Line,
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

interface HistoryPoint {
  date: string;
  max_weight: number;
  e1rm: number | null;
}

export function ExerciseHistoryChart({
  data,
  prWeight,
}: {
  data: HistoryPoint[];
  prWeight: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No history yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="date"
          tick={axisTick}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={axisTick} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        {prWeight > 0 && (
          <ReferenceLine
            y={prWeight}
            stroke="var(--color-warning)"
            strokeDasharray="4 2"
            label={{ value: "PR", fill: "var(--color-warning)", fontSize: 11 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="max_weight"
          name="Max Weight (lbs)"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS[0], r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="e1rm"
          name="Est. 1RM"
          stroke={CHART_COLORS[1]}
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
