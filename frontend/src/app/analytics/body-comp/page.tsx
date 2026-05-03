"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";

interface BodyCompData {
  nutrition: Array<{ date: string; body_weight_lbs: number; calories: number }>;
  dexa_scans: Array<{ date: string; total_lbs: number; lean_lbs: number; fat_lbs: number; bf_pct: number }>;
  session_weights: Array<{ date: string; body_weight_lbs: number }>;
}

export default function BodyCompPage() {
  const [data, setData] = useState<BodyCompData | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.bodyComposition(days).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!data) return <div className="text-gray-400">No data available.</div>;

  // Merge all weight data sources into one chart series
  const weightData = new Map<string, { date: string; macFactor?: number; session?: number }>();

  data.nutrition.forEach((n) => {
    const existing = weightData.get(n.date) || { date: n.date };
    existing.macFactor = n.body_weight_lbs;
    weightData.set(n.date, existing);
  });

  data.session_weights.forEach((s) => {
    const existing = weightData.get(s.date) || { date: s.date };
    existing.session = s.body_weight_lbs;
    weightData.set(s.date, existing);
  });

  const sortedWeights = Array.from(weightData.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  const hasDexa = data.dexa_scans.length > 0;
  const hasNutrition = data.nutrition.length > 0;

  // Latest stats
  const latestWeight = sortedWeights.length > 0
    ? sortedWeights[sortedWeights.length - 1]
    : null;

  const latestDexa = hasDexa ? data.dexa_scans[data.dexa_scans.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Body Composition</h1>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {latestWeight && (
          <StatCard
            label="Latest Weight"
            value={latestWeight.macFactor ? `${latestWeight.macFactor} lbs` : "—"}
            sub={latestWeight.macFactor ? "MacroFactor" : "from sessions"}
            icon="⚖️"
          />
        )}
        {latestDexa && (
          <>
            <StatCard label="Total Mass" value={`${latestDexa.total_lbs} lbs`} icon="📊" />
            <StatCard label="Lean Mass" value={`${latestDexa.lean_lbs} lbs`} icon="💪" />
            <StatCard label="Body Fat %" value={`${latestDexa.bf_pct}%`} icon="📉" />
          </>
        )}
      </div>

      {/* Body Weight Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4">
          Body Weight Trend
          {!hasNutrition && (
            <span className="text-gray-500 text-sm font-normal ml-2">
              (session weights only — no MacroFactor data imported)
            </span>
          )}
        </h2>
        {sortedWeights.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
            No weight data. Import MacroFactor CSV or log body weight with sessions.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={sortedWeights} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {hasNutrition && (
                <Line
                  type="monotone"
                  dataKey="macFactor"
                  name="MacroFactor (smoothed)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="session"
                name="Session Weight"
                stroke="#6366f1"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2, fill: "#6366f1" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* DEXA Section */}
      {hasDexa ? (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="font-semibold mb-4">DEXA — Body Mass Over Time</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={data.dexa_scans}
                margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(0, 7)}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total_lbs" name="Total" stroke="#e5e7eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="lean_lbs" name="Lean Mass" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="fat_lbs" name="Fat Mass" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="font-semibold mb-4">Body Fat % — Across Scans</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.dexa_scans} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(0, 7)}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="bf_pct"
                  name="BF%"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#f59e0b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* DEXA table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-x-auto">
            <h2 className="font-semibold mb-3">All Scans</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-right py-2 px-3">Total</th>
                  <th className="text-right py-2 px-3">Lean</th>
                  <th className="text-right py-2 px-3">Fat</th>
                  <th className="text-right py-2 px-3">BF%</th>
                </tr>
              </thead>
              <tbody>
                {[...data.dexa_scans].reverse().map((d) => (
                  <tr key={d.date} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 px-3 font-medium">{d.date}</td>
                    <td className="py-2 px-3 text-right">{d.total_lbs} lbs</td>
                    <td className="py-2 px-3 text-right text-green-400">{d.lean_lbs} lbs</td>
                    <td className="py-2 px-3 text-right text-red-400">{d.fat_lbs} lbs</td>
                    <td className="py-2 px-3 text-right">{d.bf_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🦴</div>
          <h3 className="font-semibold text-gray-300 mb-1">No DEXA scans yet</h3>
          <p className="text-sm text-gray-500">
            DEXA data from BodySpec will appear here once connected (post-MVP).
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, sub,
}: {
  label: string;
  value: string;
  icon: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}