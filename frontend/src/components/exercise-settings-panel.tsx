"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { api, Exercise } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function ExerciseSettingsPanel({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [low, setLow] = useState(exercise.target_reps_low?.toString() ?? "");
  const [high, setHigh] = useState(exercise.target_reps_high?.toString() ?? "");
  const [enabled, setEnabled] = useState(exercise.progression_enabled);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const lowVal = low ? parseInt(low) : null;
    const highVal = high ? parseInt(high) : null;
    await api.updateExercise(exercise.id, {
      target_reps_low: lowVal || undefined,
      target_reps_high: highVal || undefined,
      progression_enabled: enabled,
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
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
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Progressive Overload
            </div>
            {hasRange ? (
              <div className="mt-1 text-sm">
                Target:{" "}
                <span className="font-medium tabular-nums">
                  {exercise.target_reps_low}–{exercise.target_reps_high} reps
                </span>
                {exercise.progression_enabled ? (
                  <Badge
                    variant="outline"
                    className="ml-2 border-[color:var(--color-success)]/40 text-[color:var(--color-success)]"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2 font-normal">
                    Paused
                  </Badge>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">No rep range set</div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            {hasRange ? "Edit" : "Set range"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Edit progression settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rep-low" className="text-xs">
              Rep range low
            </Label>
            <Input
              id="rep-low"
              type="number"
              inputMode="numeric"
              value={low}
              onChange={(e) => setLow(e.target.value)}
              placeholder="e.g. 6"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rep-high" className="text-xs">
              Rep range high
            </Label>
            <Input
              id="rep-high"
              type="number"
              inputMode="numeric"
              value={high}
              onChange={(e) => setHigh(e.target.value)}
              placeholder="e.g. 8"
            />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Enable progression tracking</div>
            <div className="text-xs text-muted-foreground">
              Tracks rep ceilings and suggests weight increases
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              enabled ? "bg-[color:var(--color-success)]" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                enabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
