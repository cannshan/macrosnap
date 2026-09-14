import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_GOALS,
  type FoodItem,
  type Goals,
  type Meal,
  type MealSlot,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
export const PHOTO_DIR = path.join(DATA_DIR, "photos");

function connect(): Database.Database {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "macrosnap.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS meals (
      id         TEXT PRIMARY KEY,
      day        TEXT NOT NULL,
      eaten_at   TEXT NOT NULL,
      name       TEXT NOT NULL,
      slot       TEXT NOT NULL,
      items      TEXT NOT NULL,
      notes      TEXT NOT NULL DEFAULT '',
      photo      TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS meals_day_idx ON meals (day);

    CREATE TABLE IF NOT EXISTS goals (
      id       INTEGER PRIMARY KEY CHECK (id = 1),
      calories REAL NOT NULL,
      protein  REAL NOT NULL,
      carbs    REAL NOT NULL,
      fat      REAL NOT NULL,
      fiber    REAL NOT NULL
    );
  `);
  db.prepare(
    `INSERT OR IGNORE INTO goals (id, calories, protein, carbs, fat, fiber)
     VALUES (1, ?, ?, ?, ?, ?)`,
  ).run(
    DEFAULT_GOALS.calories,
    DEFAULT_GOALS.protein,
    DEFAULT_GOALS.carbs,
    DEFAULT_GOALS.fat,
    DEFAULT_GOALS.fiber,
  );
  return db;
}

// Next dev reloads modules on every edit; without this the WAL connection
// count climbs until SQLite starts refusing writes.
const globalForDb = globalThis as unknown as { __macrosnapDb?: Database.Database };
const db = globalForDb.__macrosnapDb ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.__macrosnapDb = db;

interface MealRow {
  id: string;
  day: string;
  eaten_at: string;
  name: string;
  slot: string;
  items: string;
  notes: string;
  photo: string | null;
  created_at: string;
}

function toMeal(row: MealRow): Meal {
  return {
    id: row.id,
    day: row.day,
    eatenAt: row.eaten_at,
    name: row.name,
    slot: row.slot as MealSlot,
    items: JSON.parse(row.items) as FoodItem[],
    notes: row.notes,
    photo: row.photo,
    createdAt: row.created_at,
  };
}

export function mealsForDay(day: string): Meal[] {
  const rows = db
    .prepare(`SELECT * FROM meals WHERE day = ? ORDER BY eaten_at ASC`)
    .all(day) as MealRow[];
  return rows.map(toMeal);
}

export function mealsBetween(from: string, to: string): Meal[] {
  const rows = db
    .prepare(
      `SELECT * FROM meals WHERE day >= ? AND day <= ? ORDER BY eaten_at DESC`,
    )
    .all(from, to) as MealRow[];
  return rows.map(toMeal);
}

export function getMeal(id: string): Meal | null {
  const row = db.prepare(`SELECT * FROM meals WHERE id = ?`).get(id) as
    | MealRow
    | undefined;
  return row ? toMeal(row) : null;
}

export function insertMeal(meal: Meal): Meal {
  db.prepare(
    `INSERT INTO meals (id, day, eaten_at, name, slot, items, notes, photo, created_at)
     VALUES (@id, @day, @eaten_at, @name, @slot, @items, @notes, @photo, @created_at)`,
  ).run({
    id: meal.id,
    day: meal.day,
    eaten_at: meal.eatenAt,
    name: meal.name,
    slot: meal.slot,
    items: JSON.stringify(meal.items),
    notes: meal.notes,
    photo: meal.photo,
    created_at: meal.createdAt,
  });
  return meal;
}

export function updateMeal(
  id: string,
  patch: Partial<Pick<Meal, "name" | "slot" | "items" | "notes">>,
): Meal | null {
  const existing = getMeal(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  db.prepare(
    `UPDATE meals SET name = ?, slot = ?, items = ?, notes = ? WHERE id = ?`,
  ).run(next.name, next.slot, JSON.stringify(next.items), next.notes, id);
  return next;
}

export function deleteMeal(id: string): boolean {
  const meal = getMeal(id);
  if (!meal) return false;
  db.prepare(`DELETE FROM meals WHERE id = ?`).run(id);
  if (meal.photo) {
    // A stale photo is harmless; a crashed delete is not.
    try {
      fs.unlinkSync(path.join(PHOTO_DIR, meal.photo));
    } catch {
      /* already gone */
    }
  }
  return true;
}

export function getGoals(): Goals {
  const row = db
    .prepare(`SELECT calories, protein, carbs, fat, fiber FROM goals WHERE id = 1`)
    .get() as Goals | undefined;
  return row ?? DEFAULT_GOALS;
}

export function setGoals(goals: Goals): Goals {
  db.prepare(
    `UPDATE goals SET calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ? WHERE id = 1`,
  ).run(goals.calories, goals.protein, goals.carbs, goals.fat, goals.fiber);
  return goals;
}

/** Day totals for the last `days` calendar days, oldest first. */
export function recentDays(days: number): { day: string; meals: Meal[] }[] {
  const out: { day: string; meals: Meal[] }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const pad = (n: number) => String(n).padStart(2, "0");
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    out.push({ day: key, meals: mealsForDay(key) });
  }
  return out;
}
