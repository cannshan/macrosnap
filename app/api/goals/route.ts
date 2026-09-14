import { NextResponse } from "next/server";
import { getGoals, setGoals } from "@/lib/db";
import { DEFAULT_GOALS, type Goals } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ goals: getGoals() });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<Goals>;
  const current = getGoals();
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;

  const next: Goals = {
    calories: num(body.calories, current.calories),
    protein: num(body.protein, current.protein),
    carbs: num(body.carbs, current.carbs),
    fat: num(body.fat, current.fat),
    fiber: num(body.fiber, current.fiber ?? DEFAULT_GOALS.fiber),
  };
  return NextResponse.json({ goals: setGoals(next) });
}
