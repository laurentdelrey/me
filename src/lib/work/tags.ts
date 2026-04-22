import type { MediaItem } from "@/types/tweet";

// The three filter buckets surfaced in the header dropdown.
// - "story" is the default — no filtering, just everything.
// - "prototypes" is stuff in motion: videos + animated gifs.
// - "images" is static stills.
//
// Individual media are tagged with one of "prototype" | "image" | "both".
// "both" is rare — it exists so a clip that's equally a demo and a key still
// (e.g. a short loop you want shown in both tag views) can opt in.
export type TagFilter = "story" | "prototypes" | "images";
export type MediaTag = "prototype" | "image" | "both";

export type TagOverrides = Record<string, MediaTag>; // "tweetId:mediaIndex" → tag

export const TAG_FILTERS: readonly TagFilter[] = ["story", "prototypes", "images"] as const;

export function tagFilterLabel(f: TagFilter): string {
  return f; // "story" | "prototypes" | "images" already read cleanly
}

// Heuristic: photos → image, anything that moves → prototype. This is the
// zero-effort default that makes the filter work the moment tags ship, even
// with no manual overrides yet.
export function heuristicTag(media: MediaItem): MediaTag {
  if (media.type === "video" || media.type === "animated_gif") return "prototype";
  return "image";
}

export function getTagForMedia(
  tweetId: string,
  mediaIndex: number,
  media: MediaItem,
  overrides: TagOverrides | undefined
): MediaTag {
  const key = `${tweetId}:${mediaIndex}`;
  return overrides?.[key] ?? heuristicTag(media);
}

// Does a media with the given tag belong in the active filter's stream?
// "both" is always included; "story" includes everything.
export function tagMatchesFilter(tag: MediaTag, filter: TagFilter): boolean {
  if (filter === "story") return true;
  if (tag === "both") return true;
  if (filter === "prototypes") return tag === "prototype";
  if (filter === "images") return tag === "image";
  return true;
}

export function parseTagFilter(value: string | null | undefined): TagFilter {
  if (value === "prototypes" || value === "images") return value;
  return "story";
}
