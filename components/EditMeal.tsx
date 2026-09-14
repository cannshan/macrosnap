"use client";

import { useState } from "react";
import { ItemList, useItems } from "@/components/ItemList";
import { MacroChips } from "@/components/Macro";
import { SlotPicker } from "@/components/SlotPicker";
import { round, totalOf, type Meal, type MealSlot } from "@/lib/types";

/** Correct a meal that is already in the log. */
export function EditMeal({
  meal,
  onClose,
  onSaved,
}: {
  meal: Meal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(meal.name);
  const [slot, setSlot] = useState<MealSlot>(meal.slot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useItems(meal.items);

  const totals = totalOf(list.items);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/meals/${meal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slot, items: list.items }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Could not save your changes.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your changes.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold">Edit meal</h2>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-white"
        >
          Cancel
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-5">
        {error && (
          <p className="mb-4 rounded-xl border border-fat/30 bg-fat/10 px-4 py-3 text-sm text-fat">
            {error}
          </p>
        )}

        {meal.photo && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${meal.photo}`}
              alt="The meal you photographed"
              className="w-full object-cover"
            />
          </div>
        )}

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-lg font-semibold outline-none"
              aria-label="Meal name"
            />
            <div className="mt-3">
              <SlotPicker value={slot} onChange={setSlot} />
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <MacroChips {...totals} />
            </div>
          </div>

          <p className="text-center text-xs text-muted">
            Tap any food to correct what it is, its weight, or its macros.
          </p>

          <ItemList list={list} emptyMessage="This meal has no items left." />
        </div>
      </div>

      <footer
        className="border-t border-line bg-surface px-4 py-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-lg">
          <button
            onClick={save}
            disabled={saving || list.items.length === 0}
            className="w-full rounded-2xl bg-cal py-4 font-semibold text-ink transition active:scale-[0.99] disabled:opacity-40"
          >
            {saving ? "Saving…" : `Save ${round(totals.calories)} kcal`}
          </button>
        </div>
      </footer>
    </div>
  );
}
