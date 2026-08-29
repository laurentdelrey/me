import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOB_PATH = "dashboard/hidden.json";

type HiddenPayload = { ids: string[] };

async function readHidden(): Promise<HiddenPayload> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const match = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!match) return { ids: [] };
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return { ids: [] };
    const data = (await res.json()) as HiddenPayload;
    return { ids: Array.isArray(data.ids) ? data.ids : [] };
  } catch {
    return { ids: [] };
  }
}

async function writeHidden(ids: string[]): Promise<void> {
  const unique = Array.from(new Set(ids));
  await put(BLOB_PATH, JSON.stringify({ ids: unique }), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function GET() {
  const data = await readHidden();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { id?: string; hidden?: boolean };
  if (
    !body.id ||
    typeof body.id !== "string" ||
    body.id.length > 64 ||
    typeof body.hidden !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Expected { id: string, hidden: boolean }" },
      { status: 400 }
    );
  }
  const current = await readHidden();
  const set = new Set(current.ids);
  if (body.hidden) set.add(body.id);
  else set.delete(body.id);
  const ids = Array.from(set).slice(0, 2000);
  await writeHidden(ids);
  return NextResponse.json({ ids });
}
