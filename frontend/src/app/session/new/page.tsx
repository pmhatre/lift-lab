"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, Exercise, TrainingSession, BtlData, RecentExercise } from "@/lib/api";

const DAY_TYPES = [
  { value: "", label: "No type" },
  { value: "chest_back", label: "Chest & Back" },
  { value: "legs_core", label: "Legs & Core" },
  { value: "shoulders_arms", label: "Shoulders & Arms" },
  { value: "full_body", label: "Full Body" },
];

interface LocalSet {
  reps: string;
  weight_lbs: string;
  is_warmup: boolean;
}

interface LocalExercise {
  seId: number | null;
  exercise: Exercise;
  sets: LocalSet[];
  btl: BtlData | null;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [dayType, setDayType] = useState("");
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Create session on mount
  useEffect(() => {
    api.createSession({ date: sessionDate, day_type: dayType || undefined, source: "native" }).then((s) => {
      setSession(s);
      setSessionCreated(true);
    });
    api.recentExercises(20).then(setRecentExercises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search exercises
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api.exercises(search).then(setSearchResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!session) return;
      const { id: seId } = await api.addExercise(session.id, exercise.id);
      const btl = await api.beatTheLogbook(exercise.id);

      // Pre-fill sets from last session if available
      let initialSets: LocalSet[] = [{ reps: "", weight_lbs: "", is_warmup: false }];
      if (btl?.last_session?.sets.length) {
        initialSets = btl.last_session.sets.map((s) => ({
          reps: String(s.reps ?? ""),
          weight_lbs: String(s.weight_lbs ?? ""),
          is_warmup: false,
        }));
      }

      setExercises((prev) => [
        ...prev,
        { seId, exercise, sets: initialSets, btl },
      ]);
      setSearch("");
      setSearchResults([]);
      setShowRecent(false);
    },
    [session]
  );

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...next[exIdx].sets, { reps: "", weight_lbs: "", is_warmup: false }],
      };
      return next;
    });
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof LocalSet, value: string | boolean) => {
    setExercises((prev) => {
      const next = [...prev];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
      };
      return next;
    });
  };

  const removeExercise = async (exIdx: number) => {
    const ex = exercises[exIdx];
    if (ex.seId) {
      await api.removeExercise(ex.seId);
    }
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const saveAndFinish = async () => {
    if (!session) return;
    setSaving(true);
    try {
      for (const ex of exercises) {
        if (!ex.seId) continue;
        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          const reps = parseInt(s.reps) || undefined;
          const weight = parseFloat(s.weight_lbs) || undefined;
          if (!reps && !weight) continue;
          await api.addSet(ex.seId, {
            set_number: i + 1,
            reps: reps ?? null,
            weight_lbs: weight ?? null,
            is_warmup: s.is_warmup,
          });
        }
      }
      // Check for PRs
      await api.checkPRs(session.id);
      router.push(`/session/${session.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (!sessionCreated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Creating session...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Log Session</h1>
        <button
          onClick={saveAndFinish}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium"
        >
          {saving ? "Saving..." : "Finish Session"}
        </button>
      </div>

      {/* Session meta */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Day Type</label>
          <select
            value={dayType}
            onChange={(e) => setDayType(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            {DAY_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-4">
        {exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={exIdx}
            ex={ex}
            exIdx={exIdx}
            onAddSet={() => addSet(exIdx)}
            onUpdateSet={updateSet}
            onRemoveSet={removeSet}
            onRemoveExercise={() => removeExercise(exIdx)}
          />
        ))}
      </div>

      {/* Add exercise */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search exercises to add..."
            value={search}
            onFocus={() => { setShowRecent(true); }}
            onChange={(e) => { setSearch(e.target.value); setShowRecent(true); }}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Recent exercises quick-select or search results */}
          {showRecent && search.trim().length === 0 && recentExercises.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg z-10 max-h-64 overflow-y-auto shadow-xl">
              <div className="px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-700">Recent</div>
              {recentExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => api.exercises(ex.name).then((r) => { if (r.length) addExercise(r[0]); })}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-700 text-sm"
                >
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-gray-500 ml-2 text-xs">{ex.last_used}</span>
                </button>
              ))}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg z-10 max-h-64 overflow-y-auto shadow-xl">
              {searchResults.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-700 text-sm"
                >
                  <span className="font-medium">{ex.name}</span>
                  {ex.primary_muscles.length > 0 && (
                    <span className="text-gray-400 ml-2">{ex.primary_muscles.join(", ")}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({
  ex,
  exIdx,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
}: {
  ex: LocalExercise;
  exIdx: number;
  onAddSet: () => void;
  onUpdateSet: (exIdx: number, setIdx: number, field: keyof LocalSet, value: string | boolean) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
  onRemoveExercise: () => void;
}) {
  const btl = ex.btl;
  const last = btl?.last_session;
  const rtp = btl?.ready_to_progress;
  const exercise = ex.exercise;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
        <div>
          <h3 className="font-semibold">{exercise.name}</h3>
          <div className="text-xs text-gray-400">{exercise.primary_muscles.join(", ")}</div>
        </div>
        <div className="flex items-center gap-2">
          {/* Ready to Progress badge */}
          {exercise.progression_enabled && rtp && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              rtp === "ready" ? "bg-green-900 text-green-300" :
              rtp === "close" ? "bg-yellow-900 text-yellow-300" :
              "bg-gray-700 text-gray-400"
            }`}>
              {rtp === "ready" ? "⬆️ Ready" : rtp === "close" ? "⚡ Close" : "Working"}
            </span>
          )}
          <button
            onClick={onRemoveExercise}
            className="text-gray-500 hover:text-red-400 text-sm px-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Beat the Logbook sidebar */}
      {last && (
        <div className="px-4 py-2 bg-indigo-950 border-b border-indigo-900 text-sm">
          <span className="text-indigo-300 font-medium">Last: </span>
          <span className="text-white">
            {last.top_set_weight} lbs × {last.sets.map((s) => s.reps).join(", ")} reps
          </span>
          {btl?.progression_status === "weight_pr" && (
            <span className="ml-2 text-yellow-400">🏆 Weight PR</span>
          )}
          {btl?.progression_status === "rep_pr" && (
            <span className="ml-2 text-green-400">📈 Rep PR</span>
          )}
          <span className="text-gray-400 ml-2">({last.date})</span>
          {exercise.target_reps_high && (
            <span className="text-gray-500 ml-2">🎯 {exercise.target_reps_low}–{exercise.target_reps_high} reps</span>
          )}
        </div>
      )}

      {/* Sets */}
      <div className="p-4">
        <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-2 px-1">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Weight (lbs)</div>
          <div className="col-span-4">Reps</div>
          <div className="col-span-2">Warmup</div>
          <div className="col-span-1"></div>
        </div>
        {ex.sets.map((set, setIdx) => (
          <div key={setIdx} className="grid grid-cols-12 gap-2 items-center mb-2">
            <div className="col-span-1 text-gray-500 text-sm">{setIdx + 1}</div>
            <div className="col-span-4">
              <input
                type="number"
                placeholder="lbs"
                value={set.weight_lbs}
                onChange={(e) => onUpdateSet(exIdx, setIdx, "weight_lbs", e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-4">
              <input
                type="number"
                placeholder="reps"
                value={set.reps}
                onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2 flex justify-center">
              <input
                type="checkbox"
                checked={set.is_warmup}
                onChange={(e) => onUpdateSet(exIdx, setIdx, "is_warmup", e.target.checked)}
                className="w-4 h-4"
              />
            </div>
            <div className="col-span-1">
              <button
                onClick={() => onRemoveSet(exIdx, setIdx)}
                className="text-gray-600 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Hint from last session */}
        {last && ex.sets.length > 0 && (
          <div className="text-xs text-gray-500 mt-1 mb-2">
            💡 Last time: {last.sets.map((s) => `${s.weight_lbs}×${s.reps}`).join(", ")}
          </div>
        )}

        <button
          onClick={onAddSet}
          className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          + Add Set
        </button>
      </div>
    </div>
  );
}
