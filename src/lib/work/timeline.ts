import tweetsData from "@/data/tweets.json";
import type { Tweet, MediaItem } from "@/types/tweet";
import { ERAS, ERA_ORDER, dateToEraId, type EraId } from "./eras";

export type MediaTimelineItem = {
  kind: "media";
  tweetId: string;
  date: string;
  text: string;
  replies?: string[];
  media: MediaItem;
  mediaIndex: number; // index within the tweet's media array
  eraId: EraId;
  url: string;
};

export type EraIntroItem = {
  kind: "eraIntro";
  id: string;
  eraId: EraId;
  date: string;
};

export type TldrItem = {
  kind: "tldr";
  id: "tldr";
  date: string;
};

export type SocialItem = {
  kind: "social";
  id: "social";
  date: string;
};

export type TimelineItem = MediaTimelineItem | EraIntroItem | TldrItem | SocialItem;

export function buildTimeline(hiddenIds?: Set<string>): TimelineItem[] {
  const tweets = tweetsData as Tweet[];

  // Keep only visible tweets with at least one media with a blobUrl
  const visible = tweets.filter((t) => {
    if (t.hidden) return false;
    if (hiddenIds?.has(t.id)) return false;
    return t.media.some((m) => m.blobUrl);
  });

  // Flatten into one item per media attachment, with era assignment
  const mediaItems: MediaTimelineItem[] = [];
  for (const t of visible) {
    let mi = 0;
    for (const m of t.media) {
      if (!m.blobUrl) continue;
      const eraId = dateToEraId(t.date);
      if (!eraId) continue; // skip tweets that don't fit any era
      mediaItems.push({
        kind: "media",
        tweetId: t.id,
        date: t.date,
        text: t.text,
        replies: t.replies,
        media: m,
        mediaIndex: mi,
        eraId,
        url: `https://x.com/laurentdelrey/status/${t.id}`,
      });
      mi++;
    }
  }

  // Sort oldest → newest by date (stable), tiebreak by tweet id asc
  mediaItems.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.tweetId < b.tweetId ? -1 : 1;
  });

  // Insert era intro items at the start of each era (including empty eras)
  const result: TimelineItem[] = [];
  const seenEras = new Set<EraId>();

  // tldr at the very start
  result.push({ kind: "tldr", id: "tldr", date: "2005-01-01" });

  // Walk era order (oldest → newest). For each era, insert an intro,
  // then append all media items belonging to that era.
  for (const eraId of ERA_ORDER) {
    const era = ERAS[eraId];
    // Insert era intro item
    result.push({
      kind: "eraIntro",
      id: `era-${eraId}`,
      eraId,
      date: `${Math.floor(era.startYear)}-${String(Math.max(1, Math.round((era.startYear % 1) * 12 + 1))).padStart(2, "0")}-01`,
    });
    seenEras.add(eraId);

    // Append all media items for this era, in date order
    const eraMedia = mediaItems.filter((m) => m.eraId === eraId);
    result.push(...eraMedia);
  }

  // Any media items whose era wasn't in ERA_ORDER — unlikely but safe
  const orphaned = mediaItems.filter((m) => !seenEras.has(m.eraId));
  if (orphaned.length > 0) {
    result.push(...orphaned);
  }

  // social at the very end
  result.push({ kind: "social", id: "social", date: "2026-04-10" });

  return result;
}

// Helpers
export function getItemDate(item: TimelineItem): [number, number, number] {
  const d = item.date;
  return [
    parseInt(d.substring(0, 4)),
    parseInt(d.substring(5, 7)),
    parseInt(d.substring(8, 10)),
  ];
}

export function getItemEraId(item: TimelineItem): EraId | null {
  if (item.kind === "media" || item.kind === "eraIntro") return item.eraId;
  if (item.kind === "tldr") return null;
  if (item.kind === "social") return null;
  return null;
}
