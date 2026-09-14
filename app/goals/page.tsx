"use client";

import { useEffect, useState } from "react";
import { DEFAULT_GOALS, round, type Goals } from "@/lib/types";

const FIELDS: { key: keyof Goals; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal", color: "var(--color-cal)" },
  { key: "protein", label: "Protein", unit: "g", color: "var(--color-protein)" },
  { key: "carbs", label: "Carbs", unit: "g", color: "var(--color-carbs)" },
  { key: "fat", label: "Fat", unit: "g", color: "var(--color-fat)" },
  { key: "fiber", label: "Fiber", unit: "g", color: "var(--color-fiber)" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    void fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => setGoals(data.goals ?? DEFAULT_GOALS));
  }, []);

  async function save() {
    setStatus("saving");
    await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goals),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1800);
  }

  // Calories implied by the macro split, so a mismatched target is visible.
  const implied = goals.protein * 4 + goals.carbs * 4 + goals.fat * 9;
  const drift = goals.calories > 0 ? Math.abs(implied - goals.calories) / goals.calories : 0;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Daily goals</h1>
        <p className="mt-0.5 text-sm text-muted">What a full day looks like for you.</p>
      </header>

      <div className="space-y-3">
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: field.color }}
                aria-hidden
              />
              {field.label}
            </span>
            <span className="flex items-baseline gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={goals[field.key]}
                onChange={(e) =>
                  setGoals({ ...goals, [field.key]: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-24 rounded-lg bg-surface-2 px-3 py-2 text-right font-semibold tabular-nums outline-none transition focus:ring-1 focus:ring-cal"
              />
              <span className="w-8 text-xs text-muted">{field.unit}</span>
            </span>
          </label>
        ))}
      </div>

      {drift > 0.05 && (
        <p className="mt-4 rounded-xl border border-cal/25 bg-cal/10 px-4 py-3 text-xs leading-relaxed text-cal">
          Your macro split works out to {round(implied)} kcal, which is{" "}
          {round(drift * 100)}% off your calorie target. Not a problem — just worth knowing
          which number you actually want to hit.
        </p>
      )}

      <button
        onClick={save}
        disabled={status === "saving"}
        className="mt-6 w-full rounded-2xl bg-cal py-4 font-semibold text-ink transition active:scale-[0.99] disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save goals"}
      </button>

      <p className="mt-6 px-2 text-center text-xs leading-relaxed text-muted">
        Photo estimates are estimates. They are good for tracking trends and staying
        roughly on target, not for a medical or competition diet.
      </p>
    </>
  );
}
