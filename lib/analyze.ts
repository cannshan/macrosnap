import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { round, type FoodItem } from "./types";

const MODEL = "claude-opus-5";

const FoodItemSchema = z.object({
  name: z
    .string()
    .describe("Specific name of this single food, e.g. 'grilled chicken breast'"),
  portion: z
    .string()
    .describe("Human-readable portion, e.g. '1 medium breast' or '1 cup cooked'"),
  grams: z.number().describe("Estimated edible weight in grams, as served"),
  calories: z.number().describe("Calories for this portion (not per 100g)"),
  protein: z.number().describe("Protein in grams for this portion"),
  carbs: z.number().describe("Total carbohydrate in grams for this portion"),
  fat: z.number().describe("Total fat in grams for this portion"),
  fiber: z.number().describe("Dietary fiber in grams for this portion"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("How confident you are in this item's identity and portion"),
});

const AnalysisSchema = z.object({
  is_food: z
    .boolean()
    .describe("False if the photo contains no identifiable food"),
  meal_name: z
    .string()
    .describe("Short name for the whole plate, e.g. 'Chicken and rice bowl'"),
  items: z.array(FoodItemSchema),
  notes: z
    .string()
    .describe(
      "One or two sentences on what drove the portion estimate and what is uncertain",
    ),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export interface AnalyzeResult {
  mealName: string;
  items: FoodItem[];
  notes: string;
}

const SYSTEM = `You are a nutrition estimator for a food-logging app. You see a photo of a meal and return its macros.

How to estimate:
1. List every distinct food you can actually see. Do not invent components you cannot see, and do not merge two foods into one entry.
2. Anchor portion size to reference objects in the frame: a dinner plate is 26-28cm, a side plate 20cm, a fork 19cm, a standard chopstick 23cm, a soda can 12cm tall, a takeout bowl 15-16cm across. Use plate coverage and food height together — a mound of rice covering a third of a dinner plate and standing 3cm high is roughly 200g, not 100g.
3. Weights are edible weight AS SERVED (cooked, bones and shells excluded). Say so in the portion string when it matters.
4. Count the fats you cannot see. Restaurant and pan-cooked food carries oil or butter that does not appear in the photo: a seared chicken breast, sauteed vegetables, or fried rice each typically carry 5-15g of added fat. Visible sheen, char, or a glossy sauce means more. Home-steamed or grilled food carries less. This is the single largest source of underestimation — do not skip it.
5. Dressings, sauces, glazes, and cheese are their own line items whenever they are a meaningful share of calories.
6. Macros are for the portion you estimated, not per 100g. Keep them self-consistent: protein*4 + carbs*4 + fat*9 should land within about 10% of the calorie figure.
7. Set confidence per item. Use "low" when the food is partly hidden, ambiguous between similar dishes, or has an unknown preparation. Say what is uncertain in the notes.

Prefer the realistic central estimate over a flattering one. If the photo has no food in it, set is_food to false and return an empty items array.`;

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AnalyzeError(
      "No ANTHROPIC_API_KEY set. Copy .env.local.example to .env.local, add your key, and restart the dev server.",
      500,
    );
  }
  cached ??= new Anthropic();
  return cached;
}

export class AnalyzeError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "AnalyzeError";
  }
}

const ALLOWED_MEDIA = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AllowedMedia = (typeof ALLOWED_MEDIA)[number];

/** Split a `data:image/jpeg;base64,...` URL into its media type and payload. */
export function parseDataUrl(dataUrl: string): {
  mediaType: AllowedMedia;
  base64: string;
} {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new AnalyzeError("Image must be a base64 data URL.");
  const [, mediaType, base64] = match;
  if (!ALLOWED_MEDIA.includes(mediaType as AllowedMedia)) {
    throw new AnalyzeError(
      `Unsupported image type ${mediaType}. Use JPEG, PNG, WebP, or GIF.`,
    );
  }
  return { mediaType: mediaType as AllowedMedia, base64 };
}

// Claude Opus 5 list pricing, USD per million tokens.
const INPUT_PER_MTOK = 5;
const OUTPUT_PER_MTOK = 25;

/** Print what each photo actually cost, so the running total is never a guess. */
function logCost(usage: { input_tokens: number; output_tokens: number }): void {
  const cost =
    (usage.input_tokens / 1e6) * INPUT_PER_MTOK +
    (usage.output_tokens / 1e6) * OUTPUT_PER_MTOK;
  console.log(
    `[analyze] in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cost=$${cost.toFixed(4)}`,
  );
}

export async function analyzePhoto(
  dataUrl: string,
  hint?: string,
): Promise<AnalyzeResult> {
  const { mediaType, base64 } = parseDataUrl(dataUrl);

  const prompt = hint?.trim()
    ? `Analyze this meal. The person adds: "${hint.trim()}" — trust this over your own read of the photo where they conflict.`
    : "Analyze this meal and estimate its macros.";

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    // Adaptive thinking carries the portion reasoning. Effort "medium" keeps a
    // photo under ~15s; raise to "high" to trade latency for tighter estimates.
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(AnalysisSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  logCost(response.usage);

  if (response.stop_reason === "refusal") {
    throw new AnalyzeError(
      "Claude declined to analyze this image. Try a different photo.",
      422,
    );
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new AnalyzeError("Could not read the analysis. Try again.", 502);
  }
  if (!parsed.is_food || parsed.items.length === 0) {
    throw new AnalyzeError(
      "No food found in that photo. Try a clearer shot of the plate.",
      422,
    );
  }

  return {
    mealName: parsed.meal_name,
    notes: parsed.notes,
    items: parsed.items.map(
      (i): FoodItem => ({
        name: i.name,
        portion: i.portion,
        grams: round(Math.max(0, i.grams)),
        calories: round(Math.max(0, i.calories)),
        protein: round(Math.max(0, i.protein), 1),
        carbs: round(Math.max(0, i.carbs), 1),
        fat: round(Math.max(0, i.fat), 1),
        fiber: round(Math.max(0, i.fiber), 1),
        confidence: i.confidence,
      }),
    ),
  };
}
