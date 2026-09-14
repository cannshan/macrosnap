"use client";

import { useCallback, useEffect, useState } from "react";
import { MacroChips } from "@/components/Macro";
import { MealCard } from "@/components/MealCard";
import {
  DEFAULT_GOALS,
  localDay,
  round,
  sumMacros,
  totalOf,
  type Goals,
  type Macros,
  type Meal,
} from "@/lib/types";

const DAYS = 14;

interface DayGroup {
  day: string;
  meals: Meal[];
  totals: Macros;
}

export default function HistoryPage() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const to = localDay();
    const start = new Date();
    start.setDate(start.getDate() - (DAYS - 1));
    const from = localDay(start);

    try {
      const [mealsRes, goalsRes] = await Promise.all([
        fetch(`/api/meals?from=${from}&to=${to}`),
        fetch("/api/goals"),
      ]);
      if (!mealsRes.ok || !goalsRes.ok) throw new Error("Server said no.");
      const { meals } = (await mealsRes.json()) as { meals: Meal[] };
      const goalsData = await goalsRes.json();
      setGoals(goalsData.goals ?? DEFAULT_GOALS);

      const byDay = new Map<string, Meal[]>();
      for (const meal of meals) {
        const list = byDay.get(meal.day);
        if (list) list.push(meal);
        else byDay.set(meal.day, [meal]);
      }

      setGroups(
        [...byDay.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([day, dayMeals]) => ({
            day,
            meals: dayMeals,
            totals: sumMacros(dayMeals.map((m) => totalOf(m.items))),
          })),
      );
      setError(null);
    } catch {
      setError("Could not reach the server. Is it still running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const average = groups.length
    ? sumMacros(groups.map((g) => g.totals)).calories / groups.length
    : 0;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-0.5 text-sm text-muted">
          Last {DAYS} days
          {groups.length > 0 && ` · ${round(average)} kcal/day average`}
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-fat/30 bg-fat/10 px-5 py-6 text-center">
          <p className="text-sm text-fat">{error}</p>
          <button
            onClick={() => { setLoading(true); void load(); }}
            className="mt-3 rounded-lg border border-fat/30 px-4 py-2 text-xs font-medium text-fat"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="shimmer relative h-32 overflow-hidden rounded-2xl border border-line bg-surface"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="text-sm text-muted">
            Nothing logged in the last {DAYS} days.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <DaySection key={group.day} group={group} goals={goals} onChanged={load} />
          ))}
        </div>
      )}
    </>
  );
}

function DaySection({
  group,
  goals,
  onChanged,
}: {
  group: DayGroup;
  goals: Goals;
  onChanged: () => void;
}) {
  const pct = goals.calories > 0 ? Math.min(group.totals.calories / goals.calories, 1) : 0;
  const over = group.totals.calories > goals.calories;
  const label = new Date(`${group.day}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{label}</h2>
        <MacroChips {...group.totals} />
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct * 100}%`,
            background: over ? "var(--color-fat)" : "var(--color-cal)",
          }}
        />
      </div>
      <div className="space-y-2.5">
        {group.meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}
