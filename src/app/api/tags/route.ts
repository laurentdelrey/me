import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOB_PATH = "dashboard/tags.json";

// Only stores OVERRIDES of the heuristic (photo→image, video→prototype).
// Items left at the heuristic aren't in here — keeps the file small and the
// diff meaningful (explicit curatorial decisions only).
type TagValue = "prototype" | "image" | "both";
type TagsPayload = { overrides: Record<string, TagValue> };

async function readTags(): Promise<TagsPayload> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const match = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!match) return { overrides: {} };
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return { overrides: {} };
    const data = (await res.json()) as TagsPayload;
    return {
      overrides: data && typeof data.overrides === "object" ? data.overrides : {},
    };
  } catch {
    return { overrides: {} };
  }
}

async function writeTags(overrides: Record<string, TagValue>): Promise<void> {
  await put(BLOB_PATH, JSON.stringify({ overrides }), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function GET() {
  const data = await readTags();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    tag?: TagValue | "auto" | null;
  };
  if (!body.id || typeof body.id !== "string" || body.id.length > 64) {
    return NextResponse.json(
      { error: "Expected { id: string, tag: 'prototype'|'image'|'both'|'auto' }" },
      { status: 400 }
    );
  }

  const current = await readTags();
  const next = { ...current.overrides };
  // "auto" or null clears any override so the item falls back to the heuristic.
  if (!body.tag || body.tag === "auto") {
    delete next[body.id];
  } else if (
    body.tag === "prototype" ||
    body.tag === "image" ||
    body.tag === "both"
  ) {
    next[body.id] = body.tag;
  } else {
    return NextResponse.json(
      { error: "Invalid tag value" },
      { status: 400 }
    );
  }
  if (Object.keys(next).length > 2000) {
    return NextResponse.json({ error: "Too many overrides" }, { status: 400 });
  }
  await writeTags(next);
  return NextResponse.json({ overrides: next });
}
