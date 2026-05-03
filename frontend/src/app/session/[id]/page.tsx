"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, TrainingSession } from "@/lib/api";

const DAY_TYPE_LABELS: Record<string, string> = {
  chest_back: "Chest & Back",
  legs_core: "Legs & Core",
  shoulders_arms: "Shoulders & Arms",
  full_body: "Full Body",
};

export default function SessionDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.session(id).then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading session...</div>
      </div>
    );
  }

  if (!session) return <div className="text-gray-400">Session not found.</div>;

  const totalSets = session.exercises?.reduce((acc, ex) => acc + ex.sets.filter((s) => !s.is_warmup).length, 0) ?? 0;
  const totalVolume = session.exercises?.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => !s.is_warmup).reduce((a, s) => a + (s.weight_lbs ?? 0) * (s.reps ?? 0), 0),
    0
  ) ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {DAY_TYPE_LABELS[session.day_type ?? ""] || "Training Session"}
          </h1>
          <p className="text-gray-400">{session.date}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 text-sm"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {session.duration_minutes && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{session.duration_minutes}</div>
            <div className="text-xs text-gray-400">minutes</div>
          </div>
        )}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold">{totalSets}</div>
          <div className="text-xs text-gray-400">working sets</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold">{Math.round(totalVolume).toLocaleString()}</div>
          <div className="text-xs text-gray-400">volume (lbs)</div>
        </div>
        {session.body_weight_lbs && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{session.body_weight_lbs}</div>
            <div className="text-xs text-gray-400">body weight</div>
          </div>
        )}
      </div>

      {/* Exercises */}
      <div className="space-y-4">
        {(session.exercises ?? []).map((ex) => {
          const workingSets = ex.sets.filter((s) => !s.is_warmup);
          const warmupSets = ex.sets.filter((s) => s.is_warmup);
          const maxWeight = workingSets.reduce((max, s) => Math.max(max, s.weight_lbs ?? 0), 0);

          return (
            <div key={ex.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
                <Link
                  href={`/exercise/${ex.exercise_id}`}
                  className="font-semibold hover:text-indigo-300 transition-colors"
                >
                  {ex.exercise_name}
                </Link>
                <div className="text-sm text-gray-400">
                  {workingSets.length} sets × {maxWeight} lbs
                </div>
              </div>
              <div className="p-4">
                {warmupSets.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Warmup</div>
                    <div className="flex flex-wrap gap-2">
                      {warmupSets.map((s, i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                          {s.weight_lbs ?? 0} × {s.reps ?? 0}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-1">
                  <div className="col-span-2">Set</div>
                  <div className="col-span-4">Weight</div>
                  <div className="col-span-3">Reps</div>
                  <div className="col-span-3">Vol</div>
                </div>
                {workingSets.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center py-1 border-t border-gray-800">
                    <div className="col-span-2 text-sm text-gray-500">{i + 1}</div>
                    <div className="col-span-4 text-sm font-medium">{s.weight_lbs ?? 0} lbs</div>
                    <div className="col-span-3 text-sm">{s.reps ?? 0}</div>
                    <div className="col-span-3 text-sm text-gray-400">
                      {Math.round((s.weight_lbs ?? 0) * (s.reps ?? 0))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {session.notes && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold mb-2 text-sm text-gray-400">Notes</h3>
          <p className="text-sm">{session.notes}</p>
        </div>
      )}
    </div>
  );
}
