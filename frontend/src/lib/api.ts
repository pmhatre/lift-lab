// In browser: calls /api/* which is proxied by Next.js route to FastAPI
// In SSR: same path works server-side too
const BASE = "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Exercise {
  id: number;
  name: string;
  aliases: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string | null;
  movement_pattern: string | null;
  is_compound: boolean;
  target_reps_low: number | null;
  target_reps_high: number | null;
  progression_enabled: boolean;
  notes: string | null;
}

export interface SetData {
  id: number;
  set_number: number;
  reps: number | null;
  weight_lbs: number | null;
  is_warmup: boolean;
  rpe: number | null;
  rir: number | null;
  status: string;
  notes: string | null;
}

export interface SessionExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  exercise_order: number;
  notes: string | null;
  sets: SetData[];
}

export interface TrainingSession {
  id: number;
  date: string;
  day_type: string | null;
  emphasis: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  body_weight_lbs: number | null;
  notes: string | null;
  source: string | null;
  exercise_count?: number;
  exercises?: SessionExercise[];
}

export interface BtlData {
  exercise: Exercise;
  last_session: {
    session_id: number;
    date: string;
    top_set_weight: number | null;
    top_set_reps: number | null;
    sets: { reps: number | null; weight_lbs: number | null }[];
    volume_load: number;
  } | null;
  prev_session: BtlData["last_session"] | null;
  recent_sessions: BtlData["last_session"][];
  progression_status: "weight_pr" | "rep_pr" | "maintained" | "regression" | null;
  ready_to_progress: "ready" | "close" | "working" | null;
  reps_at_ceiling: { set: number; reps: number | null; at_ceiling: boolean }[] | null;
}

export interface VolumeData {
  data: Array<{ period: string; [muscle: string]: number | string }>;
  muscle_groups: string[];
}

export interface ExerciseHistory {
  exercise: Exercise;
  history: Array<{
    session_id: number;
    date: string;
    max_weight: number;
    volume_load: number;
    e1rm: number | null;
    sets: { set_number: number; reps: number | null; weight_lbs: number | null; rpe: number | null }[];
  }>;
}

export interface PRRecord {
  id: number;
  date: string;
  exercise_name: string;
  pr_type: string;
  pr_value: number;
  previous_value: number | null;
}

export interface RecentExercise {
  id: number;
  name: string;
  last_used: string;
}

export interface FinalizePayload {
  date: string;
  day_type?: string;
  body_weight_lbs?: number;
  notes?: string;
  exercises: Array<{
    exercise_id: number;
    notes?: string;
    sets: Array<{
      reps: number | null;
      weight_lbs: number | null;
      is_warmup: boolean;
    }>;
  }>;
}

export interface FinalizeResponse {
  session: TrainingSession;
  new_prs: Array<{ exercise: string; type: string; value: number; previous: number }>;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const api = {
  // Dashboard
  dashboard: () => apiFetch<{
    today_session: TrainingSession | null;
    recent_sessions: TrainingSession[];
    sessions_this_week: number;
    body_weight_trend: Array<{ date: string; weight: number }>;
    recent_prs: PRRecord[];
  }>("/api/dashboard"),

  // Exercises
  exercises: (q?: string) =>
    apiFetch<Exercise[]>(`/api/exercises${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createExercise: (data: Partial<Exercise>) =>
    apiFetch<Exercise>("/api/exercises", { method: "POST", body: JSON.stringify(data) }),
  updateExercise: (id: number, data: Partial<Exercise>) =>
    apiFetch<Exercise>(`/api/exercises/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  recentExercises: (limit?: number) =>
    apiFetch<RecentExercise[]>(`/api/exercises/recent${limit ? `?limit=${limit}` : ""}`),

  // Sessions
  sessions: (params?: { start?: string; end?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.set("start", params.start);
    if (params?.end) qs.set("end", params.end);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return apiFetch<{ total: number; sessions: TrainingSession[] }>(`/api/sessions?${qs}`);
  },
  session: (id: number) => apiFetch<TrainingSession>(`/api/sessions/${id}`),
  createSession: (data: Partial<TrainingSession>) =>
    apiFetch<TrainingSession>("/api/sessions", { method: "POST", body: JSON.stringify(data) }),
  finalizeSession: (payload: FinalizePayload) =>
    apiFetch<FinalizeResponse>("/api/sessions/finalize", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSession: (id: number, data: Partial<TrainingSession>) =>
    apiFetch<TrainingSession>(`/api/sessions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSession: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

  // Session exercises
  addExercise: (sessionId: number, exerciseId: number) =>
    apiFetch<{ id: number; exercise_name: string }>(`/api/sessions/${sessionId}/exercises`, {
      method: "POST",
      body: JSON.stringify({ exercise_id: exerciseId }),
    }),
  removeExercise: (seId: number) =>
    apiFetch<{ ok: boolean }>(`/api/session_exercises/${seId}`, { method: "DELETE" }),

  // Sets
  addSet: (seId: number, data: Partial<SetData>) =>
    apiFetch<SetData>(`/api/session_exercises/${seId}/sets`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSet: (setId: number, data: Partial<SetData>) =>
    apiFetch<SetData>(`/api/sets/${setId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSet: (setId: number) =>
    apiFetch<{ ok: boolean }>(`/api/sets/${setId}`, { method: "DELETE" }),

  // Analytics
  volume: (params?: { start?: string; end?: string; group_by?: string }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.set("start", params.start);
    if (params?.end) qs.set("end", params.end);
    if (params?.group_by) qs.set("group_by", params.group_by);
    return apiFetch<VolumeData>(`/api/analytics/volume?${qs}`);
  },
  frequency: (weeks?: number) =>
    apiFetch<{ data: Array<{ week: string; sessions: number }> }>(
      `/api/analytics/frequency${weeks ? `?weeks=${weeks}` : ""}`
    ),
  exerciseHistory: (exerciseId: number) =>
    apiFetch<ExerciseHistory>(`/api/analytics/exercise/${exerciseId}/history`),
  beatTheLogbook: (exerciseId: number) =>
    apiFetch<BtlData>(`/api/analytics/beat-the-logbook/${exerciseId}`),

  // PR detection
  checkPRs: (sessionId: number) =>
    apiFetch<{ prs: Array<{ exercise: string; type: string; value: number; previous: number }> }>(
      "/api/prs/check",
      { method: "POST", body: JSON.stringify({ session_id: sessionId }) }
    ),
  recentPRs: (days?: number) =>
    apiFetch<PRRecord[]>(`/api/prs/recent${days ? `?days=${days}` : ""}`),

  // Body composition
  bodyComposition: (days?: number) =>
    apiFetch<{
      nutrition: Array<{ date: string; body_weight_lbs: number; calories: number }>;
      dexa_scans: Array<{ date: string; total_lbs: number; lean_lbs: number; fat_lbs: number; bf_pct: number }>;
      session_weights: Array<{ date: string; body_weight_lbs: number }>;
    }>(`/api/analytics/body-composition${days ? `?days=${days}` : ""}`),

  // Import
  importFitnotes: async (file: File, force = false) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/api/import/fitnotes?force=${force}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  importStatus: () => apiFetch<Record<string, unknown>>("/api/import/status"),
};
