"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ExerciseHistory, BtlData, Exercise } from "@/lib/api";
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

export default function ExerciseHistoryPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [btl, setBtl] = useState<BtlData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.exerciseHistory(id), api.beatTheLogbook(id)]).then(([h, b]) => {
      setHistory(h);
      setBtl(b);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!history) return <div className="text-gray-400">Exercise not found.</div>;

  const ex = history.exercise;
  const hist = history.history;

  const maxWeight = Math.max(...hist.map((h) => h.max_weight ?? 0), 0);
  const prEntry = hist.find((h) => h.max_weight === maxWeight);

  const STATUS_COLORS: Record<string, string> = {
    weight_pr: "text-yellow-400",
    rep_pr: "text-green-400",
    maintained: "text-gray-400",
    regression: "text-red-400",
  };

  const STATUS_LABELS: Record<string, string> = {
    weight_pr: "🏆 Weight PR",
    rep_pr: "📈 Rep PR",
    maintained: "Maintained",
    regression: "⬇️ Regression",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ex.name}</h1>
          <div className="flex gap-2 mt-1">
            {ex.primary_muscles.map((m) => (
              <span key={m} className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">
                {m}
              </span>
            ))}
            {ex.secondary_muscles.map((m) => (
              <span key={m} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {m}
              </span>
            ))}
          </div>
        </div>
        <Link href="/" className="text-gray-400 hover:text-white text-sm border border-gray-700 px-3 py-1.5 rounded-lg">
          ← Dashboard
        </Link>
      </div>

      {/* Exercise Settings */}
      <SettingsPanel exercise={ex} onUpdate={(updated) => {
        setHistory((prev) => prev ? { ...prev, exercise: updated } : prev);
        setBtl((prev) => prev ? { ...prev, exercise: updated } : prev);
      }} />

      {/* Beat the Logbook Card */}
      {btl?.last_session && (
        <div className="bg-gray-900 border border-indigo-800 rounded-xl p-4">
          <h2 className="font-semibold text-indigo-300 mb-3">Beat the Logbook</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400">Last Top Set</div>
              <div className="text-lg font-bold">
                {btl.last_session.top_set_weight} lbs
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Last Reps</div>
              <div className="text-lg font-bold">
                {btl.last_session.sets.map((s) => s.reps).join(", ")}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">All-Time PR</div>
              <div className="text-lg font-bold text-yellow-400">
                {maxWeight} lbs
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Status</div>
              <div className={`text-lg font-bold ${btl.progression_status ? STATUS_COLORS[btl.progression_status] : ""}`}>
                {btl.progression_status ? STATUS_LABELS[btl.progression_status] : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Overload Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4">Progressive Overload</h2>
        {hist.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
            No history yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hist} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
                formatter={(v, name) => [`${v}`, name as string]}
              />
              {maxWeight > 0 && (
                <ReferenceLine y={maxWeight} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "PR", fill: "#f59e0b", fontSize: 11 }} />
              )}
              <Line
                type="monotone"
                dataKey="max_weight"
                name="Max Weight (lbs)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: "#6366f1", r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="e1rm"
                name="Est. 1RM"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Set history table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3">Session History (last 20)</h2>
        <div className="space-y-2">
          {hist.slice(-20).reverse().map((h) => (
            <Link
              key={h.session_id}
              href={`/session/${h.session_id}`}
              className="block p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{h.date}</span>
                <span className="text-sm text-gray-400">
                  Vol: {Math.round(h.volume_load).toLocaleString()} lbs
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {h.sets.map((s, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded ${
                      s.weight_lbs === h.max_weight
                        ? "bg-indigo-900 text-indigo-200"
                        : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {s.weight_lbs}×{s.reps}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  exercise,
  onUpdate,
}: {
  exercise: Exercise;
  onUpdate: (updated: Exercise) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [low, setLow] = useState(exercise.target_reps_low?.toString() ?? "");
  const [high, setHigh] = useState(exercise.target_reps_high?.toString() ?? "");
  const [enabled, setEnabled] = useState(exercise.progression_enabled);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const lowVal = low ? parseInt(low) : null;
    const highVal = high ? parseInt(high) : null;
    const updated = await api.updateExercise(exercise.id, {
      target_reps_low: lowVal || undefined,
      target_reps_high: highVal || undefined,
      progression_enabled: enabled,
    });
    onUpdate(updated);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setLow(exercise.target_reps_low?.toString() ?? "");
    setHigh(exercise.target_reps_high?.toString() ?? "");
    setEnabled(exercise.progression_enabled);
    setEditing(false);
  };

  if (!editing) {
    const hasRange = exercise.target_reps_low && exercise.target_reps_high;
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-300">Progressive Overload</h3>
            {hasRange ? (
              <p className="text-xs text-gray-400 mt-1">
                Target: {exercise.target_reps_low}–{exercise.target_reps_high} reps
                {exercise.progression_enabled
                  ? <span className="text-green-400 ml-2">• Active</span>
                  : <span className="text-gray-500 ml-2">• Paused</span>
                }
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">No rep range set</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-gray-700"
          >
            {hasRange ? "Edit" : "Set Rep Range"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-indigo-800 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-indigo-300">Edit Progression Settings</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Rep Range Low</label>
          <input
            type="number"
            value={low}
            onChange={(e) => setLow(e.target.value)}
            placeholder="e.g. 6"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Rep Range High</label>
          <input
            type="number"
            value={high}
            onChange={(e) => setHigh(e.target.value)}
            placeholder="e.g. 8"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-300">Enable Progression Tracking</div>
          <div className="text-xs text-gray-500">When enabled, the app tracks rep ceilings and suggests weight increases</div>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-green-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={cancel}
          className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm border border-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
