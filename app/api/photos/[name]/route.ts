import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PHOTO_DIR } from "@/lib/db";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  // Names come from the DB, but treat them as untrusted anyway.
  if (!/^[A-Za-z0-9-]+\.(jpg|png|webp|gif)$/.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const file = await fs.readFile(path.join(PHOTO_DIR, name));
    const ext = name.split(".").pop()!;
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": TYPES[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
