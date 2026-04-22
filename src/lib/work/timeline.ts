import tweetsData from "@/data/tweets.json";
import type { Tweet, MediaItem } from "@/types/tweet";
import { ERAS, ERA_ORDER, dateToEraId, type EraId } from "./eras";
import {
  getTagForMedia,
  tagMatchesFilter,
  type TagFilter,
  type TagOverrides,
} from "./tags";

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

export function buildTimeline(
  hiddenIds?: Set<string>,
  opts?: { filter?: TagFilter; tagOverrides?: TagOverrides }
): TimelineItem[] {
  const tweets = tweetsData as Tweet[];
  const filter: TagFilter = opts?.filter ?? "story";
  const tagOverrides = opts?.tagOverrides;

  // Keep tweets with at least one media with a blobUrl. Individual media are
  // filtered below via per-media keys ("tweetId:mediaIndex") in hiddenIds.
  const candidates = tweets.filter((t) =>
    t.media.some((m) => m.blobUrl)
  );

  // Flatten into one item per media attachment, with era assignment.
  const mediaItems: MediaTimelineItem[] = [];
  for (const t of candidates) {
    let mi = 0;
    for (const m of t.media) {
      if (!m.blobUrl) continue;
      const key = `${t.id}:${mi}`;
      if (hiddenIds?.has(key)) {
        mi++;
        continue;
      }
      // Tag filter (prototypes / images / story). "story" lets everything
      // through; the other two filter media by their derived-or-overridden tag.
      const tag = getTagForMedia(t.id, mi, m, tagOverrides);
      if (!tagMatchesFilter(tag, filter)) {
        mi++;
        continue;
      }
      const eraId = dateToEraId(t.date);
      if (!eraId) {
        mi++;
        continue;
      }
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

  // tldr intro only belongs in "story" mode — filtered views jump straight
  // into the content stream.
  if (filter === "story") {
    result.push({ kind: "tldr", id: "tldr", date: "2026-04-10" });
  }

  for (const eraId of newestToOldest) {
    const era = ERAS[eraId];
    const eraMedia = mediaItems.filter((m) => m.eraId === eraId);
    // Filtered views (prototypes / images) are a pure content stream — drop
    // the era-boundary chapter cards entirely so the user scrubs through
    // one tag's work without narrative interruptions. In "story" mode the
    // cards stay for context.
    if (filter === "story") {
      result.push({
        kind: "eraIntro",
        id: `era-${eraId}`,
        eraId,
        date: `${Math.floor(era.endYear === Infinity ? 2026 : era.endYear)}-01-01`,
      });
    }
    result.push(...eraMedia);
  }

  // social/contact card removed — handled by the top-right header link instead.

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
