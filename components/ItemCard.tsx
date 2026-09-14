"use client";

import { useState } from "react";
import { MacroChips } from "@/components/Macro";
import { rescaleToGrams, round, scaleItem, type FoodItem } from "@/lib/types";

const CONFIDENCE_STYLE: Record<FoodItem["confidence"], string> = {
  high: "bg-protein/15 text-protein",
  medium: "bg-cal/15 text-cal",
  low: "bg-fat/15 text-fat",
};

const MACRO_FIELDS: { key: keyof FoodItem; label: string; color: string }[] = [
  { key: "calories", label: "kcal", color: "var(--color-cal)" },
  { key: "protein", label: "Protein", color: "var(--color-protein)" },
  { key: "carbs", label: "Carbs", color: "var(--color-carbs)" },
  { key: "fat", label: "Fat", color: "var(--color-fat)" },
  { key: "fiber", label: "Fiber", color: "var(--color-fiber)" },
];

/**
 * One food in a meal. Collapsed it shows the estimate and a portion slider;
 * opened it lets you correct the food itself — name, portion, weight, macros.
 */
export function ItemCard({
  item,
  base,
  startOpen = false,
  onChange,
  onRemove,
}: {
  item: FoodItem;
  /** The original estimate, so the slider scales from it instead of compounding. */
  base: FoodItem;
  startOpen?: boolean;
  onChange: (next: FoodItem, options?: { resetBase?: boolean }) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(startOpen);

  const factor = base.grams > 0 ? item.grams / base.grams : 1;

  function field(key: keyof FoodItem, value: number) {
    // A hand-typed number replaces the estimate, so it becomes the new baseline.
    onChange({ ...item, [key]: value }, { resetBase: true });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setEditing((v) => !v)}
            className="min-w-0 flex-1 text-left"
            aria-expanded={editing}
          >
            <p className="flex items-center gap-1.5 font-medium">
              <span className="truncate">{item.name || "Untitled item"}</span>
              <svg
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${
                  editing ? "rotate-180" : ""
                }`}
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 15.5 5.5 9h13z" />
              </svg>
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {item.portion || "tap to edit"} · {item.grams}g
            </p>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${CONFIDENCE_STYLE[item.confidence]}`}
              title="How sure the estimate is for this item"
            >
              {item.confidence}
            </span>
            <button
              onClick={onRemove}
              className="text-muted transition hover:text-fat"
              aria-label={`Remove ${item.name || "item"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M9 3h6v2h5v2H4V5h5zM6 9h12l-1 12H7z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3">
          <MacroChips {...item} />
        </div>

        {!editing && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={0.25}
              max={2.5}
              step={0.05}
              value={Math.min(2.5, Math.max(0.25, factor))}
              onChange={(e) => onChange(scaleItem(base, Number(e.target.value)))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-cal"
              aria-label={`Portion size for ${item.name || "item"}`}
            />
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted">
              {round(factor * 100)}%
            </span>
          </div>
        )}
      </div>

      {editing && (
        <div className="space-y-3 border-t border-line p-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">
              What is it?
            </span>
            <input
              value={item.name}
              onChange={(e) => onChange({ ...item, name: e.target.value })}
              placeholder="e.g. brown rice"
              autoFocus={startOpen}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 outline-none transition focus:border-cal"
            />
          </label>

          <div className="flex gap-2">
            <label className="block flex-1">
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Portion
              </span>
              <input
                value={item.portion}
                onChange={(e) => onChange({ ...item, portion: e.target.value })}
                placeholder="1 cup cooked"
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 outline-none transition focus:border-cal"
              />
            </label>
            <label className="block w-28">
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Grams
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={item.grams}
                onChange={(e) =>
                  // Changing weight scales the macros with it — the usual intent.
                  onChange(rescaleToGrams(item, Number(e.target.value) || 0), {
                    resetBase: true,
                  })
                }
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-right tabular-nums outline-none transition focus:border-cal"
              />
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted">
              Macros for this portion
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {MACRO_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span
                    className="mb-1 block text-center text-[10px] font-semibold"
                    style={{ color: f.color }}
                  >
                    {f.label}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item[f.key] as number}
                    onChange={(e) => field(f.key, Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-lg border border-line bg-surface-2 px-1 py-2 text-center tabular-nums outline-none transition focus:border-cal"
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={() => setEditing(false)}
            className="w-full rounded-lg bg-surface-2 py-2.5 text-xs font-semibold text-muted transition hover:text-white"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
