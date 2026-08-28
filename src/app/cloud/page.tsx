import type { Metadata } from "next";
import { list } from "@vercel/blob";
import { buildTimeline } from "@/lib/work/timeline";
import { ERAS, ERA_ORDER } from "@/lib/work/eras";
import { getTagForMedia, type TagOverrides } from "@/lib/work/tags";
import CloudExperience from "@/components/cloud/CloudExperience";
import type { CloudItem, CloudEra } from "@/components/cloud/CloudScene";

export const metadata: Metadata = {
  title: "cloud — laurent del rey",
  description: "ten years of prototypes, floating",
};

export const revalidate = 300;

// Tweet text in the archive carries HTML entities — decode for display.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

// Same graceful blob reads as the dashboard APIs — locally without a blob
// token these just fall back to defaults.
async function readBlobJson<T>(path: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: path, limit: 1 });
    const match = blobs.find((b) => b.pathname === path);
    if (!match) return null;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function CloudPage() {
  const [hiddenData, tagsData] = await Promise.all([
    readBlobJson<{ ids?: string[] }>("dashboard/hidden.json"),
    readBlobJson<{ overrides?: TagOverrides }>("dashboard/tags.json"),
  ]);
  const hidden = new Set(hiddenData?.ids ?? []);
  const overrides: TagOverrides = tagsData?.overrides ?? {};

  const timeline = buildTimeline(hidden);

  const items: CloudItem[] = [];
  for (const item of timeline) {
    if (item.kind !== "media") continue;
    const m = item.media;
    const img =
      m.type === "photo"
        ? m.midBlobUrl ?? m.thumbBlobUrl ?? m.blobUrl
        : m.midBlobUrl ?? m.posterBlobUrl;
    if (!img) continue;
    const imgFull = m.type === "photo" ? m.blobUrl ?? img : m.posterBlobUrl ?? img;
    items.push({
      id: `${item.tweetId}:${item.mediaIndex}`,
      date: item.date,
      text: decodeEntities(item.text.split("\n")[0]).slice(0, 140),
      url: item.url,
      img,
      imgFull,
      videoUrl: m.type === "video" ? m.blobUrl : undefined,
      w: m.width ?? 1,
      h: m.height ?? 1,
      eraId: item.eraId,
      tag: getTagForMedia(item.tweetId, item.mediaIndex, m, overrides),
    });
  }

  // Oldest → newest so time flows along the spiral.
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Era metadata for the rail + minimap, newest first (matches the site).
  const eras: CloudEra[] = [...ERA_ORDER]
    .reverse()
    .filter((id) => items.some((it) => it.eraId === id))
    .map((id) => ({
      id,
      label: ERAS[id].label,
      years: ERAS[id].years,
      color: ERAS[id].color,
      city: ERAS[id].city,
      center: ERAS[id].location,
      zoom: ERAS[id].zoom,
    }));

  return <CloudExperience items={items} eras={eras} />;
}
