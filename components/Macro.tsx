"use client";

import { round } from "@/lib/types";

const CIRC = 2 * Math.PI * 52;

/** Big calorie dial for the top of the day view. */
export function CalorieRing({
  eaten,
  goal,
}: {
  eaten: number;
  goal: number;
}) {
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const over = eaten > goal;
  const left = goal - eaten;

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-line)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={over ? "var(--color-fat)" : "var(--color-cal)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums tracking-tight">
          {round(Math.abs(left))}
        </span>
        <span className="text-xs text-muted">
          {over ? "kcal over" : "kcal left"}
        </span>
        <span className="mt-1 text-[11px] text-muted tabular-nums">
          {round(eaten)} / {round(goal)}
        </span>
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  eaten,
  goal,
  color,
  unit = "g",
}: {
  label: string;
  eaten: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min((eaten / goal) * 100, 100) : 0;
  const over = eaten > goal;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted">{label}</span>
        <span className="tabular-nums">
          <span className={over ? "text-fat" : "text-white"}>{round(eaten, 1)}</span>
          <span className="text-muted">
            {" / "}
            {round(goal)}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: over ? "var(--color-fat)" : color }}
        />
      </div>
    </div>
  );
}

/** Compact macro readout used on meal cards and result previews. */
export function MacroChips({
  calories,
  protein,
  carbs,
  fat,
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const chips = [
    { v: round(calories), u: "kcal", c: "text-cal" },
    { v: round(protein, 1), u: "P", c: "text-protein" },
    { v: round(carbs, 1), u: "C", c: "text-carbs" },
    { v: round(fat, 1), u: "F", c: "text-fat" },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
      {chips.map((chip) => (
        <span key={chip.u}>
          <span className={`font-semibold ${chip.c}`}>{chip.v}</span>
          <span className="ml-0.5 text-muted">{chip.u}</span>
        </span>
      ))}
    </div>
  );
}
