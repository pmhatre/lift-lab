/**
 * Server-side fetch helpers for React Server Components.
 *
 * Uses the absolute backend URL (BACKEND_URL env var, defaults to localhost:8000)
 * so RSCs hit FastAPI directly without going through the Next.js rewrite hop.
 */
import type {
  ExerciseHistory,
  BtlData,
  TrainingSession,
  PRRecord,
  VolumeData,
  RecentExercise,
} from "./api";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Backend ${res.status} on ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface DashboardData {
  today_session: TrainingSession | null;
  recent_sessions: TrainingSession[];
  sessions_this_week: number;
  body_weight_trend: Array<{ date: string; weight: number }>;
  recent_prs: PRRecord[];
}

export const serverApi = {
  dashboard: () => get<DashboardData>("/api/dashboard"),
  volume: (params?: { start?: string; end?: string; group_by?: string }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.set("start", params.start);
    if (params?.end) qs.set("end", params.end);
    if (params?.group_by) qs.set("group_by", params.group_by);
    return get<VolumeData>(`/api/analytics/volume${qs.size ? `?${qs}` : ""}`);
  },
  frequency: (weeks?: number) =>
    get<{ data: Array<{ week: string; sessions: number }> }>(
      `/api/analytics/frequency${weeks ? `?weeks=${weeks}` : ""}`
    ),
  bodyComposition: (days?: number) =>
    get<{
      nutrition: Array<{ date: string; body_weight_lbs: number; calories: number }>;
      dexa_scans: Array<{ date: string; total_lbs: number; lean_lbs: number; fat_lbs: number; bf_pct: number }>;
      session_weights: Array<{ date: string; body_weight_lbs: number }>;
    }>(`/api/analytics/body-composition${days ? `?days=${days}` : ""}`),
  session: (id: number) => get<TrainingSession>(`/api/sessions/${id}`),
  exerciseHistory: (id: number) => get<ExerciseHistory>(`/api/analytics/exercise/${id}/history`),
  beatTheLogbook: (id: number) => get<BtlData>(`/api/analytics/beat-the-logbook/${id}`),
  recentExercises: (limit = 20) =>
    get<RecentExercise[]>(`/api/exercises/recent?limit=${limit}`),
};
