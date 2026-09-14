export type Confidence = "high" | "medium" | "low";

export interface FoodItem {
  name: string;
  portion: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: Confidence;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Meal {
  id: string;
  day: string; // YYYY-MM-DD, local to the device that logged it
  eatenAt: string; // ISO timestamp
  name: string;
  slot: MealSlot;
  items: FoodItem[];
  notes: string;
  photo: string | null; // filename under /api/photos
  createdAt: string;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const DEFAULT_GOALS: Goals = {
  calories: 2200,
  protein: 160,
  carbs: 220,
  fat: 70,
  fiber: 30,
};

export const EMPTY_MACROS: Macros = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

/** Sum a list of food items into a single macro total. */
export function totalOf(items: FoodItem[]): Macros {
  return items.reduce<Macros>(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { ...EMPTY_MACROS },
  );
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce<Macros>(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
    }),
    { ...EMPTY_MACROS },
  );
}

/** Scale one item's nutrition by a factor, keeping the gram weight in step. */
export function scaleItem(item: FoodItem, factor: number): FoodItem {
  return {
    ...item,
    grams: round(item.grams * factor),
    calories: round(item.calories * factor),
    protein: round(item.protein * factor, 1),
    carbs: round(item.carbs * factor, 1),
    fat: round(item.fat * factor, 1),
    fiber: round(item.fiber * factor, 1),
  };
}

export function round(n: number, places = 0): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Local calendar day (not UTC) — a 9pm meal must not land on tomorrow. */
export function localDay(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function slotForNow(d: Date = new Date()): MealSlot {
  const h = d.getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

/** Resize an item to a new gram weight, carrying its macros along proportionally. */
export function rescaleToGrams(item: FoodItem, grams: number): FoodItem {
  const safe = Math.max(0, grams);
  // With no original weight there is no ratio to scale by — keep the macros.
  if (item.grams <= 0) return { ...item, grams: round(safe) };
  return scaleItem(item, safe / item.grams);
}

export function blankItem(): FoodItem {
  return {
    name: "",
    portion: "",
    grams: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    confidence: "high", // typed in by hand, so it is as good as the user's own read
  };
}
