"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, TrainingSession, PRRecord } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

interface DashboardData {
  today_session: TrainingSession | null;
  recent_sessions: TrainingSession[];
  sessions_this_week: number;
  body_weight_trend: Array<{ date: string; weight: number }>;
  recent_prs: PRRecord[];
}

const DAY_TYPE_LABELS: Record<string, string> = {
  chest_back: "Chest & Back",
  legs_core: "Legs & Core",
  shoulders_arms: "Shoulders & Arms",
  full_body: "Full Body",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [volumeData, setVolumeData] = useState<{
    data: Array<Record<string, number | string>>;
    muscle_groups: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard(),
      api.volume({ group_by: "week" }),
    ]).then(([dash, vol]) => {
      setData(dash);
      setVolumeData(vol);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const recentBw = data.body_weight_trend.slice(-30);
  const latestWeight = recentBw.length > 0 ? recentBw[recentBw.length - 1].weight : null;

  // Volume chart: last 8 weeks
  const recentVolume = volumeData?.data.slice(-8) ?? [];
  const topMuscles = (volumeData?.muscle_groups ?? []).slice(0, 6);

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/session/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Log Session
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Sessions This Week"
          value={String(data.sessions_this_week)}
          icon="📅"
        />
        <StatCard
          label="Body Weight"
          value={latestWeight ? `${latestWeight} lbs` : "—"}
          icon="⚖️"
        />
        <StatCard
          label="Today"
          value={data.today_session ? DAY_TYPE_LABELS[data.today_session.day_type ?? ""] || "Session logged" : "Rest day"}
          icon="🏋️"
        />
        <StatCard
          label="Recent Sessions"
          value={String(data.recent_sessions.length)}
          icon="📊"
          sub="last 7 days"
        />
      </div>

      {/* Recent PRs */}
      {data.recent_prs.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-950/50 to-amber-950/50 border border-yellow-800/50 rounded-xl p-4">
          <h2 className="font-semibold text-yellow-300 mb-3 flex items-center gap-2">
            🏆 Recent PRs
            <span className="text-xs text-yellow-500 font-normal">
              ({data.recent_prs.length} in log)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.recent_prs.slice(0, 8).map((pr, i) => (
              <span
                key={i}
                className="bg-yellow-950/60 text-yellow-200 text-sm px-3 py-1.5 rounded-lg border border-yellow-800/30"
              >
                <span className="font-medium">{pr.exercise_name}</span>
                <span className="text-yellow-400 ml-1">
                  {pr.pr_type === "weight" ? `${pr.pr_value} lbs` : `e1RM ${pr.pr_value}`}
                </span>
                {pr.previous_value && pr.previous_value > 0 && (
                  <span className="text-yellow-600 text-xs ml-1">
                    (was {Math.round(pr.previous_value)})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Today's Session */}
      {data.today_session ? (
        <div className="bg-gray-900 border border-indigo-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-indigo-300">Today&apos;s Session</h2>
            <Link href={`/session/${data.today_session.id}`} className="text-xs text-gray-400 hover:text-white">
              View →
            </Link>
          </div>
          <p className="text-lg font-medium">
            {DAY_TYPE_LABELS[data.today_session.day_type ?? ""] || "Training Session"}
          </p>
          {data.today_session.duration_minutes && (
            <p className="text-sm text-gray-400">{data.today_session.duration_minutes} min</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 mb-3">No session logged today</p>
          <Link
            href="/session/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Start Session
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Muscle Group Volume (last 8 weeks)</h2>
          {recentVolume.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No volume data yet. Import your training history to see this chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={recentVolume} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                {topMuscles.map((muscle, i) => (
                  <Bar key={muscle} dataKey={muscle} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Body Weight Sparkline */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Body Weight (last 30 days)</h2>
          {recentBw.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No weight data yet. Import MacroFactor data or log sessions with body weight.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={recentBw} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3">Recent Sessions</h2>
        {data.recent_sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent sessions. Start logging!</p>
        ) : (
          <div className="space-y-2">
            {data.recent_sessions.map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                <div>
                  <span className="font-medium">
                    {DAY_TYPE_LABELS[s.day_type ?? ""] || "Training Session"}
                  </span>
                  <span className="text-gray-400 text-sm ml-2">
                    {s.exercise_count ? `${s.exercise_count} exercises` : ""}
                    {s.source && s.source !== "native" && ` · ${s.source}`}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">{s.date}</div>
                  {s.duration_minutes && (
                    <div className="text-xs text-gray-500">{s.duration_minutes} min</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
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
