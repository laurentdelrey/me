"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

type MediaItem = {
  type: string;
  localFile: string;
  width: number;
  height: number;
  durationMs?: number;
  blobUrl?: string;
};

export type Tweet = {
  id: string;
  date: string;
  text: string;
  media: MediaItem[];
  favoriteCount: number;
  retweetCount: number;
  replies?: string[];
  hidden?: boolean;
};

// Deterministic hash from tweet ID for consistent random entrance
function hashId(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getEntranceParams(id: string) {
  const h = hashId(id);
  const edge = h % 4;
  const baseOffset = 300 + (h % 200);
  const crossOffset = ((h >> 4) % 200) - 100;
  const rotate = ((h >> 8) % 30) - 15;

  switch (edge) {
    case 0: return { x: -baseOffset, y: crossOffset, rotate };
    case 1: return { x: baseOffset, y: crossOffset, rotate };
    case 2: return { x: crossOffset, y: -baseOffset, rotate };
    default: return { x: crossOffset, y: baseOffset, rotate };
  }
}

function AnimatedCard({
  tweet,
  index,
  onMouseEnter,
  onMouseLeave,
}: {
  tweet: Tweet;
  index: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const firstMedia = tweet.media[0];
  if (!firstMedia?.blobUrl) return null;

  const entrance = getEntranceParams(tweet.id);
  const isVideo = firstMedia.type === "video";

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        x: entrance.x,
        y: entrance.y,
        rotate: entrance.rotate,
        scale: 0.85,
      }}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }
          : undefined
      }
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 18,
        mass: 0.3,
        delay: (index % 6) * 0.04,
      }}
      style={{ overflow: "visible" }}
    >
      <a
        href={`https://x.com/laurentdelrey/status/${tweet.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="gallery-card block overflow-hidden"
        data-no-cursor-expand
        data-tweet-id={tweet.id}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {isVideo ? (
          <video
            src={firstMedia.blobUrl}
            muted
            loop
            autoPlay
            playsInline
            className="w-full h-auto object-cover block"
          />
        ) : (
          <img
            src={firstMedia.blobUrl}
            alt={tweet.text}
            loading="lazy"
            className="w-full h-auto object-cover block"
          />
        )}
      </a>
    </motion.div>
  );
}

export default function EraGallery({
  tweets,
  onHover,
  onLeave,
}: {
  tweets: Tweet[];
  onHover: (tweet: Tweet) => void;
  onLeave: () => void;
}) {
  if (tweets.length === 0) return null;

  return (
    <div style={{ width: "100%", boxSizing: "border-box", overflow: "visible" }}>
      <div
        style={{ display: "flex", gap: "0px", overflow: "visible" }}
        className="era-gallery-grid"
      >
        {[0, 1].map((col) => (
          <div key={col} style={{ flex: 1, minWidth: 0, overflow: "visible" }}>
            {tweets
              .filter((_, i) => i % 2 === col)
              .map((tweet, i) => (
                <AnimatedCard
                  key={tweet.id}
                  tweet={tweet}
                  index={i}
                  onMouseEnter={() => onHover(tweet)}
                  onMouseLeave={onLeave}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
