export type MediaItem = {
  type: string; // "photo" | "video" | "animated_gif"
  localFile: string;
  width: number;
  height: number;
  durationMs?: number;
  blobUrl?: string;
};

export type Tweet = {
  id: string;
  date: string; // "YYYY-MM-DD"
  text: string;
  media: MediaItem[];
  favoriteCount: number;
  retweetCount: number;
  replies?: string[];
  hidden?: boolean;
};
