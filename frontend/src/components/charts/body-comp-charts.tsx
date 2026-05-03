"use client";

import {
  LineChart,
  Line,
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

interface WeightPoint {
  date: string;
  macFactor?: number;
  session?: number;
}

export function BodyWeightTrendChart({
  data,
  hasNutrition,
}: {
  data: WeightPoint[];
  hasNutrition: boolean;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No weight data. Import MacroFactor CSV or log body weight with sessions.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="date"
          tick={axisTick}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={axisTick} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {hasNutrition && (
          <Line
            type="monotone"
            dataKey="macFactor"
            name="MacroFactor"
            stroke={CHART_COLORS[1]}
            strokeWidth={2}
            dot={false}
          />
        )}
        <Line
          type="monotone"
          dataKey="session"
          name="Session weight"
          stroke={CHART_COLORS[0]}
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={{ r: 2, fill: CHART_COLORS[0] }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface DexaPoint {
  date: string;
  total_lbs: number;
  lean_lbs: number;
  fat_lbs: number;
  bf_pct: number;
}

export function DexaMassChart({ data }: { data: DexaPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="date"
          tick={axisTick}
          tickFormatter={(v: string) => v.slice(0, 7)}
        />
        <YAxis tick={axisTick} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="total_lbs"
          name="Total"
          stroke="var(--color-foreground)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="lean_lbs"
          name="Lean Mass"
          stroke={CHART_COLORS[1]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="fat_lbs"
          name="Fat Mass"
          stroke={CHART_COLORS[3]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BodyFatChart({ data }: { data: DexaPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
        <XAxis
          dataKey="date"
          tick={axisTick}
          tickFormatter={(v: string) => v.slice(0, 7)}
        />
        <YAxis tick={axisTick} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Line
          type="monotone"
          dataKey="bf_pct"
          name="BF%"
          stroke={CHART_COLORS[2]}
          strokeWidth={2}
          dot={{ r: 4, fill: CHART_COLORS[2] }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
