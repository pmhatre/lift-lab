"use client";

import { useEffect, useState } from "react";
import { api, VolumeData } from "@/lib/api";
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

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
];

export default function VolumePage() {
  const [data, setData] = useState<VolumeData | null>(null);
  const [weeks, setWeeks] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const end = new Date().toISOString().slice(0, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    const start = startDate.toISOString().slice(0, 10);

    setLoading(true);
    api.volume({ start, end, group_by: "week" }).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [weeks]);

  const chartData = data?.data ?? [];
  const muscles = data?.muscle_groups ?? [];

  // Calculate totals per muscle group across all weeks
  const muscleTotals = muscles.map((m) => ({
    muscle: m,
    total: chartData.reduce((acc, row) => acc + ((row[m] as number) || 0), 0),
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Volume Dashboard</h1>
        <select
          value={weeks}
          onChange={(e) => setWeeks(parseInt(e.target.value))}
          className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={4}>Last 4 weeks</option>
          <option value={8}>Last 8 weeks</option>
          <option value={12}>Last 12 weeks</option>
          <option value={24}>Last 24 weeks</option>
          <option value={52}>Last 52 weeks</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          {/* Stacked bar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="font-semibold mb-4">Sets per Muscle Group by Week</h2>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  {muscles.map((muscle, i) => (
                    <Bar
                      key={muscle}
                      dataKey={muscle}
                      stackId="a"
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Muscle group totals */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="font-semibold mb-4">Total Sets by Muscle Group</h2>
            <div className="space-y-2">
              {muscleTotals.map((m, i) => (
                <div key={m.muscle} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: COLORS[muscles.indexOf(m.muscle) % COLORS.length] }}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm">{m.muscle}</span>
                    <span className="text-sm font-medium">{m.total} sets</span>
                  </div>
                  <div className="w-32 bg-gray-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(m.total / (muscleTotals[0]?.total || 1)) * 100}%`,
                        background: COLORS[muscles.indexOf(m.muscle) % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
