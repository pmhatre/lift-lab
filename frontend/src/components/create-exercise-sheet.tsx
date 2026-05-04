"use client";

import { useState } from "react";

import { api, Exercise } from "@/lib/api";
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS } from "@/lib/constants";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CreateExerciseSheet({
  open,
  initialName,
  onCancel,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  onCancel: () => void;
  onCreated: (exercise: Exercise) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        {/* Re-mount on each open with the latest initialName so form state resets cleanly. */}
        {open && (
          <CreateExerciseForm
            key={initialName}
            initialName={initialName}
            onCancel={onCancel}
            onCreated={onCreated}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CreateExerciseForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string;
  onCancel: () => void;
  onCreated: (exercise: Exercise) => void;
}) {
  const [name, setName] = useState(initialName);
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleMuscle = (m: string) => {
    setPrimaryMuscles((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.createExercise({
        name: name.trim(),
        primary_muscles: primaryMuscles,
        equipment: equipment ?? undefined,
      });
      onCreated(created);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Create exercise</SheetTitle>
        <SheetDescription>
          Pick muscle groups so volume analytics buckets correctly. Equipment
          is optional. You can edit details later from the exercise page.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4">
        <div className="space-y-1.5">
          <Label htmlFor="ex-name">Name</Label>
          <Input
            id="ex-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Primary muscles</Label>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((m) => {
              const active = primaryMuscles.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    active
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Equipment</Label>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_OPTIONS.map((eq) => {
              const active = equipment === eq.value;
              return (
                <button
                  key={eq.value}
                  type="button"
                  onClick={() => setEquipment(active ? null : eq.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    active
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {eq.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <SheetFooter className="flex-row gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={submitting || !name.trim()}
          className="flex-1 bg-[color:var(--color-success)] text-white hover:bg-[color:var(--color-success)]/85"
        >
          {submitting ? "Creating…" : "Create & Add"}
        </Button>
      </SheetFooter>
    </>
  );
}
