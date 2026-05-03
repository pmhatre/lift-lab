"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Zap,
  Trophy,
  TrendingUp,
  Search,
  X,
  Plus,
  Target,
  Lightbulb,
} from "lucide-react";

import { api, Exercise, BtlData, RecentExercise } from "@/lib/api";
import { DAY_TYPE_OPTIONS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

interface LocalSet {
  reps: string;
  weight_lbs: string;
  is_warmup: boolean;
}

interface LocalExercise {
  exercise: Exercise;
  sets: LocalSet[];
  btl: BtlData | null;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [dayType, setDayType] = useState("");
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.recentExercises(20).then(setRecentExercises);
  }, []);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      api.exercises(trimmed).then(setSearchResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const visibleSearchResults = search.trim() ? searchResults : [];

  const addExercise = useCallback(async (exercise: Exercise) => {
    const btl = await api.beatTheLogbook(exercise.id);
    let initialSets: LocalSet[] = [{ reps: "", weight_lbs: "", is_warmup: false }];
    if (btl?.last_session?.sets.length) {
      initialSets = btl.last_session.sets.map((s) => ({
        reps: String(s.reps ?? ""),
        weight_lbs: String(s.weight_lbs ?? ""),
        is_warmup: false,
      }));
    }
    setExercises((prev) => [...prev, { exercise, sets: initialSets, btl }]);
    setSearch("");
    setSearchResults([]);
    setShowRecent(false);
  }, []);

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

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof LocalSet,
    value: string | boolean
  ) => {
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

  const removeExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const saveAndFinish = async () => {
    setSaving(true);
    try {
      const payload = {
        date: sessionDate,
        day_type: dayType && dayType !== "_none" ? dayType : undefined,
        exercises: exercises.map((ex) => ({
          exercise_id: ex.exercise.id,
          sets: ex.sets.map((s) => ({
            reps: s.reps ? parseInt(s.reps) : null,
            weight_lbs: s.weight_lbs ? parseFloat(s.weight_lbs) : null,
            is_warmup: s.is_warmup,
          })),
        })),
      };
      const result = await api.finalizeSession(payload);
      router.push(`/session/${result.session.id}`);
    } finally {
      setSaving(false);
    }
  };

  const hasContent = exercises.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Log Session"
        actions={
          <Button
            onClick={saveAndFinish}
            disabled={saving || !hasContent}
            className="bg-[color:var(--color-success)] hover:bg-[color:var(--color-success)]/85"
          >
            {saving ? "Saving..." : "Finish Session"}
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-[170px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Day Type</Label>
            <Select value={dayType} onValueChange={(v) => setDayType(v ?? "")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="No type" />
              </SelectTrigger>
              <SelectContent>
                {DAY_TYPE_OPTIONS.map((dt) => (
                  <SelectItem key={dt.value || "_none"} value={dt.value || "_none"}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
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

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="text"
              placeholder="Search exercises to add..."
              value={search}
              onFocus={() => setShowRecent(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowRecent(true);
              }}
              className="pl-9"
            />

            {showRecent && search.trim().length === 0 && recentExercises.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
                <div className="border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Recent
                </div>
                {recentExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() =>
                      api.exercises(ex.name).then((r) => {
                        if (r.length) addExercise(r[0]);
                      })
                    }
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {ex.last_used}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {visibleSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
                {visibleSearchResults.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="font-medium">{ex.name}</span>
                    {ex.primary_muscles.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {ex.primary_muscles.join(", ")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-secondary/40 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{exercise.name}</h3>
          {exercise.primary_muscles.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {exercise.primary_muscles.join(", ")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {exercise.progression_enabled && rtp && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                rtp === "ready" &&
                  "border-[color:var(--color-success)]/40 text-[color:var(--color-success)]",
                rtp === "close" &&
                  "border-[color:var(--color-warning)]/40 text-[color:var(--color-warning)]",
                rtp === "working" && "text-muted-foreground"
              )}
            >
              {rtp === "ready" ? <ArrowUp className="h-3 w-3" /> : null}
              {rtp === "close" ? <Zap className="h-3 w-3" /> : null}
              {rtp === "ready" ? "Ready" : rtp === "close" ? "Close" : "Working"}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemoveExercise}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {last && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-primary/5 px-4 py-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-primary">Last</span>
          <span className="tabular-nums">
            {last.top_set_weight} lbs × {last.sets.map((s) => s.reps).join(", ")} reps
          </span>
          {btl?.progression_status === "weight_pr" && (
            <Badge
              variant="outline"
              className="gap-1 border-[color:var(--color-warning)]/40 text-[color:var(--color-warning)]"
            >
              <Trophy className="h-3 w-3" />
              Weight PR
            </Badge>
          )}
          {btl?.progression_status === "rep_pr" && (
            <Badge
              variant="outline"
              className="gap-1 border-[color:var(--color-success)]/40 text-[color:var(--color-success)]"
            >
              <TrendingUp className="h-3 w-3" />
              Rep PR
            </Badge>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">({last.date})</span>
          {exercise.target_reps_high && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <Target className="h-3 w-3" />
              {exercise.target_reps_low}–{exercise.target_reps_high} reps
            </span>
          )}
        </div>
      )}

      <CardContent className="p-4">
        <div className="mb-2 grid grid-cols-12 gap-2 px-1 text-xs uppercase tracking-wide text-muted-foreground">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Weight</div>
          <div className="col-span-4">Reps</div>
          <div className="col-span-2 text-center">Warmup</div>
          <div className="col-span-1"></div>
        </div>
        {ex.sets.map((set, setIdx) => (
          <div key={setIdx} className="mb-2 grid grid-cols-12 items-center gap-2">
            <div className="col-span-1 text-sm text-muted-foreground tabular-nums">
              {setIdx + 1}
            </div>
            <div className="col-span-4">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="lbs"
                value={set.weight_lbs}
                onChange={(e) => onUpdateSet(exIdx, setIdx, "weight_lbs", e.target.value)}
                className="h-9 tabular-nums"
              />
            </div>
            <div className="col-span-4">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="reps"
                value={set.reps}
                onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
                className="h-9 tabular-nums"
              />
            </div>
            <div className="col-span-2 flex justify-center">
              <input
                type="checkbox"
                checked={set.is_warmup}
                onChange={(e) => onUpdateSet(exIdx, setIdx, "is_warmup", e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveSet(exIdx, setIdx)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {last && ex.sets.length > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="h-3 w-3" />
            Last time: {last.sets.map((s) => `${s.weight_lbs}×${s.reps}`).join(", ")}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={onAddSet} className="mt-3 text-primary">
          <Plus className="h-3.5 w-3.5" />
          Add Set
        </Button>
      </CardContent>
    </Card>
  );
}
