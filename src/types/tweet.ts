export type MediaItem = {
  type: string; // "photo" | "video" | "animated_gif"
  localFile: string;
  width: number;
  height: number;
  durationMs?: number;
  blobUrl?: string;
  // Pre-generated 200px-wide JPEG thumbnail for the filmstrip. Photos get
  // a downscaled version; videos get a poster frame extracted at ~0.1s.
  // Both let the filmstrip skip Vercel's image optimizer entirely and
  // serve a tiny payload straight from Blob CDN.
  thumbBlobUrl?: string;
  posterBlobUrl?: string;
};

export type Tweet = {
  id: string;
  date: string; // "YYYY-MM-DD"
  text: string;
  media: MediaItem[];
  favoriteCount: number;
  retweetCount: number;
  replies?: string[];
};
