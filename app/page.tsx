"use client";

import { useCallback, useEffect, useState } from "react";
import { AddMeal } from "@/components/AddMeal";
import { CalorieRing, MacroBar } from "@/components/Macro";
import { MealCard } from "@/components/MealCard";
import {
  DEFAULT_GOALS,
  EMPTY_MACROS,
  localDay,
  sumMacros,
  totalOf,
  type Goals,
  type Meal,
} from "@/lib/types";

export default function TodayPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Rendered on the client only — the server's calendar day can differ.
  const [day, setDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    const today = localDay();
    setDay(today);
    try {
      const [mealsRes, goalsRes] = await Promise.all([
        fetch(`/api/meals?day=${today}`),
        fetch("/api/goals"),
      ]);
      if (!mealsRes.ok || !goalsRes.ok) throw new Error("Server said no.");
      const mealsData = await mealsRes.json();
      const goalsData = await goalsRes.json();
      setMeals(mealsData.meals ?? []);
      setGoals(goalsData.goals ?? DEFAULT_GOALS);
      setError(null);
    } catch {
      // Without this the page sits on loading skeletons forever and says nothing.
      setError("Could not reach the server. Is it still running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eaten = meals.length
    ? sumMacros(meals.map((m) => totalOf(m.items)))
    : EMPTY_MACROS;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="mt-0.5 text-sm text-muted">
          {day
            ? new Date(`${day}T00:00:00`).toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : " "}
        </p>
      </header>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <CalorieRing eaten={eaten.calories} goal={goals.calories} />
        <div className="mt-6 space-y-4">
          <MacroBar
            label="Protein"
            eaten={eaten.protein}
            goal={goals.protein}
            color="var(--color-protein)"
          />
          <MacroBar
            label="Carbs"
            eaten={eaten.carbs}
            goal={goals.carbs}
            color="var(--color-carbs)"
          />
          <MacroBar label="Fat" eaten={eaten.fat} goal={goals.fat} color="var(--color-fat)" />
          <MacroBar
            label="Fiber"
            eaten={eaten.fiber}
            goal={goals.fiber}
            color="var(--color-fiber)"
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">
          {meals.length} {meals.length === 1 ? "meal" : "meals"} logged
        </h2>

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
            {[0, 1].map((i) => (
              <div
                key={i}
                className="shimmer relative h-24 overflow-hidden rounded-2xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="text-sm text-muted">
              Nothing logged yet. Tap the camera to photograph your first meal.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      <AddMeal onSaved={load} />
    </>
  );
}
