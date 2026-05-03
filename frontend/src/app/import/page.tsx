"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, FileText, Upload as UploadIcon } from "lucide-react";

import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

interface ImportResult {
  sessions_created?: number;
  sessions_skipped?: number;
  sets_created?: number;
  unmatched_exercises?: string[];
}

export default function ImportPage() {
  const [fitnotes, setFitnotes] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [force, setForce] = useState(false);

  useEffect(() => {
    api.importStatus().then(setStatus);
  }, []);

  const importFitnotes = async () => {
    if (!fitnotes) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.importFitnotes(fitnotes, force);
      setResult(r);
      setStatus(await api.importStatus());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  const fitnotesStatus = status?.fitnotes as
    | { last_import?: string; sessions_created?: number; sets_created?: number }
    | undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Import Data"
        description="Bring training history in from other apps"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            FitNotes CSV
          </CardTitle>
          <CardDescription>
            Export from FitNotes app → Settings → Export Data, then upload here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fitnotesStatus?.last_import && (
            <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs">
              <span className="text-muted-foreground">Last import: </span>
              <span className="tabular-nums">
                {new Date(fitnotesStatus.last_import).toLocaleString()}
              </span>
              {typeof fitnotesStatus.sessions_created === "number" && (
                <span className="text-muted-foreground">
                  {" · "}
                  {fitnotesStatus.sessions_created} sessions, {fitnotesStatus.sets_created} sets
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fitnotes-csv">CSV file</Label>
            <Input
              id="fitnotes-csv"
              type="file"
              accept=".csv"
              onChange={(e) => setFitnotes(e.target.files?.[0] ?? null)}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
              className="h-4 w-4"
            />
            <span>Force re-import (overwrite existing sessions)</span>
          </label>

          <Button onClick={importFitnotes} disabled={!fitnotes || importing}>
            <UploadIcon className="h-4 w-4" />
            {importing ? "Importing..." : "Import FitNotes"}
          </Button>

          {result && (
            <Card className="border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/5">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2 font-semibold text-[color:var(--color-success)]">
                  <CheckCircle2 className="h-4 w-4" />
                  Import complete
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Created</div>
                    <div className="font-semibold tabular-nums">{result.sessions_created}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Skipped</div>
                    <div className="font-semibold tabular-nums">{result.sessions_skipped}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Sets</div>
                    <div className="font-semibold tabular-nums">{result.sets_created}</div>
                  </div>
                </div>
                {result.unmatched_exercises && result.unmatched_exercises.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-warning)]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {result.unmatched_exercises.length} auto-created exercises
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.unmatched_exercises.map((e) => (
                        <Badge key={e} variant="secondary" className="font-normal">
                          {e}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These were added to the exercise library. You can update their muscle
                      groups via the API.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-base">Boostcamp CSV</CardTitle>
          <CardDescription>Coming soon — export from Boostcamp and upload here.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-base">MacroFactor CSV</CardTitle>
          <CardDescription>
            Coming soon — export from MacroFactor and upload here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
