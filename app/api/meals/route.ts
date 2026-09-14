import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseDataUrl } from "@/lib/analyze";
import { PHOTO_DIR, insertMeal, mealsBetween, mealsForDay } from "@/lib/db";
import { MEAL_SLOTS, localDay, type FoodItem, type Meal, type MealSlot } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from && to) return NextResponse.json({ meals: mealsBetween(from, to) });
  const day = searchParams.get("day") ?? localDay();
  return NextResponse.json({ meals: mealsForDay(day) });
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function savePhoto(dataUrl: string, id: string): Promise<string | null> {
  try {
    const { mediaType, base64 } = parseDataUrl(dataUrl);
    const name = `${id}.${EXT[mediaType] ?? "jpg"}`;
    await fs.mkdir(PHOTO_DIR, { recursive: true });
    await fs.writeFile(path.join(PHOTO_DIR, name), Buffer.from(base64, "base64"));
    return name;
  } catch (error) {
    // Losing the thumbnail should never lose the logged meal.
    console.error("could not save photo:", error);
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    slot?: string;
    items?: FoodItem[];
    notes?: string;
    image?: string;
    eatenAt?: string;
    day?: string;
  };

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "A meal needs at least one item." }, { status: 400 });
  }

  const id = randomUUID();
  const eatenAt = body.eatenAt ?? new Date().toISOString();
  const slot = (MEAL_SLOTS as string[]).includes(body.slot ?? "")
    ? (body.slot as MealSlot)
    : "snack";

  const meal: Meal = {
    id,
    day: body.day ?? localDay(new Date(eatenAt)),
    eatenAt,
    name: body.name?.trim() || "Meal",
    slot,
    items: body.items,
    notes: body.notes ?? "",
    photo: body.image ? await savePhoto(body.image, id) : null,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ meal: insertMeal(meal) }, { status: 201 });
}
