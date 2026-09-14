import { NextResponse } from "next/server";
import { AnalyzeError, analyzePhoto } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { image?: string; hint?: string };
    if (!body.image) {
      return NextResponse.json({ error: "No image supplied." }, { status: 400 });
    }
    const result = await analyzePhoto(body.image, body.hint);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalyzeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("analyze failed:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
