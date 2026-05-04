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
  Trash2,
} from "lucide-react";

import { api, Exercise, BtlData, RecentExercise } from "@/lib/api";
import { DAY_TYPE_OPTIONS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { CreateExerciseSheet } from "@/components/create-exercise-sheet";
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

  const trimmedSearch = search.trim();
  const visibleSearchResults = trimmedSearch ? searchResults : [];
  const showCreateOption = trimmedSearch.length >= 2;
  const exactMatch = visibleSearchResults.some(
    (e) => e.name.toLowerCase() === trimmedSearch.toLowerCase()
  );

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

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [createSheetName, setCreateSheetName] = useState("");

  const openCreateSheet = useCallback((name: string) => {
    setCreateSheetName(name);
    setCreateSheetOpen(true);
  }, []);

  const handleCreated = useCallback(
    async (exercise: Exercise) => {
      setCreateSheetOpen(false);
      await addExercise(exercise);
    },
    [addExercise]
  );

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const sets = next[exIdx].sets;
      const last = sets[sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [
          ...sets,
          {
            reps: last?.reps ?? "",
            weight_lbs: last?.weight_lbs ?? "",
            is_warmup: false,
          },
        ],
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
        day_type: dayType.trim() || undefined,
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

  const discardSession = () => {
    // Session is local-state-only until Finish — discarding is just navigating
    // away. Confirm only if the user has actually started logging something.
    const dirty =
      exercises.length > 0 || dayType.trim().length > 0;
    if (dirty && !window.confirm("Discard this session? Your unsaved exercises and sets will be lost.")) {
      return;
    }
    router.push("/");
  };

  const hasContent = exercises.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24 sm:pb-0">
      <PageHeader
        title="Log Session"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={discardSession}
              className="text-muted-foreground hover:text-destructive hover:border-destructive/40"
            >
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
            <Button
              onClick={saveAndFinish}
              disabled={saving || !hasContent}
              className="hidden bg-[color:var(--color-success)] hover:bg-[color:var(--color-success)]/85 sm:inline-flex"
            >
              {saving ? "Saving..." : "Finish Session"}
            </Button>
          </div>
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
          <div className="flex-1 space-y-1.5 min-w-[200px]">
            <Label htmlFor="day-type" className="text-xs">Day Type</Label>
            <Input
              id="day-type"
              type="text"
              value={dayType}
              onChange={(e) => setDayType(e.target.value)}
              placeholder="e.g. Chest & Back, or anything"
              className="w-full"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DAY_TYPE_OPTIONS.filter((d) => d.value).map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setDayType(dt.label)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    dayType === dt.label
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="text"
              placeholder="Search exercises to add..."
              value={search}
              onFocus={() => {
                setShowRecent(true);
                // Scroll the search Card to the top of the viewport so the
                // dropdown that opens below has the full screen height to
                // render. The Card sits ABOVE the exercise list so the
                // dropdown overlays mostly-empty space.
                setTimeout(() => {
                  searchRef.current?.scrollIntoView({
                    block: "start",
                    behavior: "smooth",
                  });
                }, 100);
              }}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowRecent(true);
              }}
              className="pl-9"
            />

            {showRecent && search.trim().length === 0 && recentExercises.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
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

            {(visibleSearchResults.length > 0 || showCreateOption) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
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
                {showCreateOption && !exactMatch && (
                  <button
                    onClick={() => openCreateSheet(trimmedSearch)}
                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-secondary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>
                      Create new exercise:{" "}
                      <span className="font-medium text-foreground">
                        &ldquo;{trimmedSearch}&rdquo;
                      </span>
                    </span>
                  </button>
                )}
              </div>
            )}
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

      {/* Mobile sticky finish bar — hide while the search dropdown is open so
          its bottom rows + the Create option aren't covered. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden",
          search.trim().length > 0 && "hidden"
        )}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          onClick={saveAndFinish}
          disabled={saving || !hasContent}
          className="h-11 w-full bg-[color:var(--color-success)] text-base hover:bg-[color:var(--color-success)]/85"
        >
          {saving ? "Saving..." : "Finish Session"}
        </Button>
      </div>

      <CreateExerciseSheet
        open={createSheetOpen}
        initialName={createSheetName}
        onCancel={() => setCreateSheetOpen(false)}
        onCreated={handleCreated}
      />
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
            size="icon-lg"
            onClick={onRemoveExercise}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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

      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2">
          {ex.sets.map((set, setIdx) => (
            <SetRow
              key={setIdx}
              setIdx={setIdx}
              set={set}
              onUpdate={(field, value) => onUpdateSet(exIdx, setIdx, field, value)}
              onRemove={() => onRemoveSet(exIdx, setIdx)}
            />
          ))}
        </div>

        {last && ex.sets.length > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="h-3 w-3" />
            Last time: {last.sets.map((s) => `${s.weight_lbs}×${s.reps}`).join(", ")}
          </div>
        )}

        <Button
          variant="outline"
          onClick={onAddSet}
          className="mt-3 h-10 w-full text-primary sm:h-9 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Set
        </Button>
      </CardContent>
    </Card>
  );
}

function SetRow({
  setIdx,
  set,
  onUpdate,
  onRemove,
}: {
  setIdx: number;
  set: LocalSet;
  onUpdate: (field: keyof LocalSet, value: string | boolean) => void;
  onRemove: () => void;
}) {
  const stepWeight = (delta: number) => {
    const current = parseFloat(set.weight_lbs) || 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    onUpdate("weight_lbs", next === 0 ? "" : String(next));
  };
  const stepReps = (delta: number) => {
    const current = parseInt(set.reps) || 0;
    const next = Math.max(0, current + delta);
    onUpdate("reps", next === 0 ? "" : String(next));
  };

  return (
    <div className="rounded-md border border-border/40 bg-secondary/20 p-2.5">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium tabular-nums text-muted-foreground">
          Set {setIdx + 1}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={set.is_warmup}
              onChange={(e) => onUpdate("is_warmup", e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            Warmup
          </label>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stepper
          label="lbs"
          value={set.weight_lbs}
          inputMode="decimal"
          onChange={(v) => onUpdate("weight_lbs", v)}
          onStep={stepWeight}
        />
        <Stepper
          label="reps"
          value={set.reps}
          inputMode="numeric"
          onChange={(v) => onUpdate("reps", v)}
          onStep={stepReps}
        />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  inputMode,
  onChange,
  onStep,
}: {
  label: string;
  value: string;
  inputMode: "decimal" | "numeric";
  onChange: (v: string) => void;
  onStep: (delta: number) => void;
}) {
  const stepDelta = inputMode === "decimal" ? 5 : 1;
  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={() => onStep(-stepDelta)}
        aria-label={`Decrease ${label}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-background text-lg font-medium text-foreground/80 transition active:scale-95 hover:bg-secondary"
      >
        −
      </button>
      <Input
        type="number"
        inputMode={inputMode}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 flex-1 px-1 text-center text-base font-semibold tabular-nums"
      />
      <button
        type="button"
        onClick={() => onStep(stepDelta)}
        aria-label={`Increase ${label}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-background text-lg font-medium text-foreground/80 transition active:scale-95 hover:bg-secondary"
      >
        +
      </button>
    </div>
  );
}
