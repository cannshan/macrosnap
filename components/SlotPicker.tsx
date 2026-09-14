"use client";

import { MEAL_SLOTS, type MealSlot } from "@/lib/types";

export function SlotPicker({
  value,
  onChange,
}: {
  value: MealSlot;
  onChange: (slot: MealSlot) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {MEAL_SLOTS.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition ${
            value === option ? "bg-cal text-ink" : "bg-surface-2 text-muted hover:text-white"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
