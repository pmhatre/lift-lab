/**
 * Server-side data access for React Server Components.
 *
 * Calls the data layer directly — no HTTP roundtrip. Same code path the
 * Route Handlers use, just bypassing the request/response shell.
 */
import {
  beatTheLogbook,
  bodyComposition,
  dashboard,
  exerciseHistory,
  frequency,
  volumeByMuscleGroup,
} from "./data/analytics";
import { recentExercises } from "./data/exercises";
import { getSessionDetail } from "./data/sessions";

import type {
  ExerciseHistoryResult,
  BtlResult,
  VolumeResult,
  FrequencyResult,
  BodyCompositionResult,
  DashboardResult,
} from "./data/analytics";
import type { RecentExerciseDto } from "./data/exercises";
import type { SessionDto } from "./data/serializers";

// Re-export the DTO types so RSC pages can `import type` from here.
export type {
  ExerciseHistoryResult,
  BtlResult,
  VolumeResult,
  FrequencyResult,
  BodyCompositionResult,
  DashboardResult,
  RecentExerciseDto,
  SessionDto,
};

export const serverApi = {
  dashboard: (): Promise<DashboardResult> => dashboard(),
  volume: (params?: { start?: string; end?: string; group_by?: string }): Promise<VolumeResult> =>
    volumeByMuscleGroup({
      start: params?.start,
      end: params?.end,
      groupBy: (params?.group_by as "week" | "session" | undefined) ?? "week",
    }),
  frequency: (weeks?: number): Promise<FrequencyResult> => frequency(weeks ?? 12),
  bodyComposition: (days?: number): Promise<BodyCompositionResult> =>
    bodyComposition(days ?? 90),
  session: async (id: number): Promise<SessionDto | null> => getSessionDetail(id),
  exerciseHistory: async (id: number): Promise<ExerciseHistoryResult | null> =>
    exerciseHistory(id),
  beatTheLogbook: async (id: number): Promise<BtlResult | null> => beatTheLogbook(id),
  recentExercises: async (limit = 20): Promise<RecentExerciseDto[]> =>
    recentExercises(limit),
};
