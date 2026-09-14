import { NextResponse } from "next/server";
import { deleteMeal, updateMeal } from "@/lib/db";
import { MEAL_SLOTS, type FoodItem, type MealSlot } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    slot?: string;
    items?: FoodItem[];
    notes?: string;
  };
  const patch: Parameters<typeof updateMeal>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (Array.isArray(body.items)) patch.items = body.items;
  if (typeof body.notes === "string") patch.notes = body.notes;
  if ((MEAL_SLOTS as string[]).includes(body.slot ?? "")) {
    patch.slot = body.slot as MealSlot;
  }

  const meal = updateMeal(id, patch);
  if (!meal) return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  return NextResponse.json({ meal });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!deleteMeal(id)) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
