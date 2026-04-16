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

  // Sort newest → oldest (reading left→right on filmstrip means newest starts on left)
  mediaItems.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.tweetId < b.tweetId ? 1 : -1;
  });

  // Build timeline: tl;dr → newest era → its media → next era boundary → media → ... → kid → social
  // Era order (newest → oldest): meta, free, snap, tribe, hustle, lost, kid
  const newestToOldest = [...ERA_ORDER].reverse(); // meta, free, snap, tribe, hustle, lost, kid

  const result: TimelineItem[] = [];

  // tldr intro at the start
  result.push({ kind: "tldr", id: "tldr", date: "2026-04-10" });

  for (const eraId of newestToOldest) {
    const era = ERAS[eraId];
    // Era intro marks the BOUNDARY into this era
    result.push({
      kind: "eraIntro",
      id: `era-${eraId}`,
      eraId,
      date: `${Math.floor(era.endYear === Infinity ? 2026 : era.endYear)}-01-01`,
    });
    // All media belonging to this era, already sorted newest→oldest
    const eraMedia = mediaItems.filter((m) => m.eraId === eraId);
    result.push(...eraMedia);
  }

  // social/contact card at the very end
  result.push({ kind: "social", id: "social", date: "2005-01-01" });

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
