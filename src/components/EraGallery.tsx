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

function RevealCard({
  tweet,
  onMouseEnter,
  onMouseLeave,
}: {
  tweet: Tweet;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const firstMedia = tweet.media[0];
  if (!firstMedia?.blobUrl) return null;

  const isVideo = firstMedia.type === "video";

  return (
    <motion.a
      ref={ref}
      href={`https://x.com/laurentdelrey/status/${tweet.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="gallery-card block overflow-hidden"
      data-no-cursor-expand
      data-tweet-id={tweet.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
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
    </motion.a>
  );
}

export default function EraGallery({
  tweets,
  label,
  onHover,
  onLeave,
}: {
  tweets: Tweet[];
  label?: string;
  onHover: (tweet: Tweet) => void;
  onLeave: () => void;
}) {
  if (tweets.length === 0) return null;

  // Year range for label
  const firstYear = tweets[tweets.length - 1]?.date.substring(0, 4);
  const lastYear = tweets[0]?.date.substring(0, 4);
  const yearLabel = firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`;

  return (
    <div style={{ padding: "0 12%", width: "100%", boxSizing: "border-box" }}>
      {/* Free ideas label */}
      {label && (
        <div
          style={{
            padding: "28px 0 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          <span className="text-white/15 text-xs lowercase tracking-widest">
            {label} · {yearLabel}
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>
      )}

      {/* 2-column masonry grid */}
      <div style={{ display: "flex", gap: "0px" }} className="era-gallery-grid">
        {[0, 1].map((col) => (
          <div key={col} style={{ flex: 1, minWidth: 0 }}>
            {tweets
              .filter((_, i) => i % 2 === col)
              .map((tweet) => (
                <RevealCard
                  key={tweet.id}
                  tweet={tweet}
                  onMouseEnter={() => onHover(tweet)}
                  onMouseLeave={onLeave}
                />
              ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.era-gallery-grid) {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
