"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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

export default function FrequencyPage() {
  const [data, setData] = useState<Array<{ week: string; sessions: number }>>([]);
  const [weeks, setWeeks] = useState(16);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.frequency(weeks).then((d) => {
      setData(d.data);
      setLoading(false);
    });
  }, [weeks]);

  const avgSessions =
    data.length > 0
      ? Math.round((data.reduce((acc, d) => acc + d.sessions, 0) / data.length) * 10) / 10
      : 0;

  const maxSessions = Math.max(...data.map((d) => d.sessions), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Training Frequency</h1>
        <select
          value={weeks}
          onChange={(e) => setWeeks(parseInt(e.target.value))}
          className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={8}>Last 8 weeks</option>
          <option value={16}>Last 16 weeks</option>
          <option value={24}>Last 24 weeks</option>
          <option value={52}>Last 52 weeks</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{avgSessions}</div>
          <div className="text-sm text-gray-400">avg sessions/week</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{maxSessions}</div>
          <div className="text-sm text-gray-400">best week</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">
            {data.filter((d) => d.sessions > 0).length}
          </div>
          <div className="text-sm text-gray-400">active weeks</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-4">Sessions per Week</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="week"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
                interval={Math.floor(data.length / 10)}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <ReferenceLine
                y={avgSessions}
                stroke="#6366f1"
                strokeDasharray="4 2"
                label={{ value: `Avg: ${avgSessions}`, fill: "#6366f1", fontSize: 11 }}
              />
              <Bar dataKey="sessions" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Week details */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3">Recent Weeks</h2>
        <div className="space-y-1">
          {[...data].reverse().slice(0, 12).map((d) => (
            <div key={d.week} className="flex items-center gap-3 py-1">
              <span className="text-sm text-gray-400 w-24">{d.week}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-indigo-600"
                  style={{ width: `${(d.sessions / maxSessions) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-right">{d.sessions}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
