"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Import Data</h1>

      {/* Import status */}
      {Object.keys(status).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm text-gray-400">Previous Imports</h2>
          {Object.entries(status).map(([source, info]) => (
            <div key={source} className="text-sm">
              <span className="text-indigo-300 font-medium capitalize">{source}:</span>{" "}
              <span className="text-gray-400">{JSON.stringify(info)}</span>
            </div>
          ))}
        </div>
      )}

      {/* FitNotes import */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-1">FitNotes CSV</h2>
        <p className="text-sm text-gray-400 mb-4">
          Export from FitNotes app → Settings → Export Data. Upload the CSV file here.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFitnotes(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
              className="w-4 h-4"
            />
            Force re-import (overwrite existing sessions)
          </label>

          <button
            onClick={importFitnotes}
            disabled={!fitnotes || importing}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium text-sm"
          >
            {importing ? "Importing..." : "Import FitNotes"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-4 bg-emerald-950 border border-emerald-800 rounded-lg p-4">
            <h3 className="font-semibold text-emerald-300 mb-2">✅ Import Complete</h3>
            <div className="text-sm space-y-1">
              <div>Sessions created: <span className="font-medium">{result.sessions_created}</span></div>
              <div>Sessions skipped: <span className="font-medium">{result.sessions_skipped}</span></div>
              <div>Sets created: <span className="font-medium">{result.sets_created}</span></div>
              {result.unmatched_exercises && result.unmatched_exercises.length > 0 && (
                <div className="mt-2">
                  <div className="text-yellow-400 font-medium mb-1">
                    ⚠️ {result.unmatched_exercises.length} exercises auto-created (no match found):
                  </div>
                  <ul className="text-gray-300 text-xs space-y-0.5">
                    {result.unmatched_exercises.map((e) => (
                      <li key={e}>• {e}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-1">
                    These were added to the exercise library. You can update their muscle groups via the API.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-950 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Info about other importers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 opacity-60">
        <h2 className="font-semibold mb-1">Boostcamp CSV</h2>
        <p className="text-sm text-gray-400">Coming soon — export from Boostcamp and upload here.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 opacity-60">
        <h2 className="font-semibold mb-1">MacroFactor CSV</h2>
        <p className="text-sm text-gray-400">Coming soon — export from MacroFactor and upload here.</p>
      </div>
    </div>
  );
}
