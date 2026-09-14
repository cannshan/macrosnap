"use client";

import { useState } from "react";
import { EditMeal } from "@/components/EditMeal";
import { MacroChips } from "@/components/Macro";
import { totalOf, type Meal } from "@/lib/types";

export function MealCard({
  meal,
  onChanged,
  showDay = false,
}: {
  meal: Meal;
  onChanged: () => void;
  showDay?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const totals = totalOf(meal.items);

  const time = new Date(meal.eatenAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  async function remove() {
    setDeleting(true);
    const response = await fetch(`/api/meals/${meal.id}`, { method: "DELETE" });
    if (response.ok) onChanged();
    else setDeleting(false);
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-surface transition-opacity ${
        deleting ? "opacity-40" : ""
      }`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
        aria-expanded={expanded}
      >
        {meal.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${meal.photo}`}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M7 2v8a3 3 0 0 0 2 2.8V22h2V12.8A3 3 0 0 0 13 10V2h-2v7H9V2H7zm10 0c-1.7 0-3 2.7-3 6 0 2.3.7 4.2 1.7 5.1V22h2V2z" />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-medium">{meal.name}</p>
            <span className="shrink-0 text-[11px] text-muted">
              {showDay ? `${meal.day} · ${time}` : time}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] capitalize text-muted">{meal.slot}</p>
          <div className="mt-1.5">
            <MacroChips {...totals} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line px-3 py-3">
          <ul className="space-y-2">
            {meal.items.map((item, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="truncate">{item.name}</span>
                  <span className="ml-1.5 text-muted">{item.grams}g</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {item.calories} kcal
                </span>
              </li>
            ))}
          </ul>
          {meal.notes && (
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
              {meal.notes}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 rounded-lg border border-line py-2 text-xs font-medium text-muted transition hover:border-cal/40 hover:text-cal"
            >
              Edit meal
            </button>
            <button
              onClick={remove}
              disabled={deleting}
              className="flex-1 rounded-lg border border-line py-2 text-xs font-medium text-muted transition hover:border-fat/40 hover:text-fat"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {editing && (
        <EditMeal
          meal={meal}
          onClose={() => setEditing(false)}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}
