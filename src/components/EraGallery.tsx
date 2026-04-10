"use client";

import { useEffect, useRef } from "react";

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

function GalleryCard({
  tweet,
  onMouseEnter,
  onMouseLeave,
}: {
  tweet: Tweet;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const firstMedia = tweet.media[0];
  if (!firstMedia?.blobUrl) return null;

  const isVideo = firstMedia.type === "video";

  return (
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
  );
}

export default function EraGallery({
  tweets,
  onHover,
  onLeave,
  onVisibleDate,
}: {
  tweets: Tweet[];
  label?: string;
  onHover: (tweet: Tweet) => void;
  onLeave: () => void;
  onVisibleDate?: (date: [number, number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Report date of currently visible tweet based on scroll position
  useEffect(() => {
    if (!onVisibleDate || tweets.length === 0) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;

      // How far through this gallery are we?
      const totalH = containerRef.current.offsetHeight;
      const scrolled = viewportH / 2 - rect.top; // midpoint of viewport relative to gallery top
      const progress = Math.max(0, Math.min(1, scrolled / totalH));

      const idx = Math.min(tweets.length - 1, Math.floor(progress * tweets.length));
      const d = tweets[idx]?.date;
      if (d) {
        const parts = d.split("-");
        onVisibleDate([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])]);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onVisibleDate, tweets]);

  if (tweets.length === 0) return null;

  return (
    <div ref={containerRef} style={{ width: "100%", boxSizing: "border-box" }}>
      {/* 2-column masonry grid */}
      <div style={{ display: "flex", gap: "0px" }} className="era-gallery-grid">
        {[0, 1].map((col) => (
          <div key={col} style={{ flex: 1, minWidth: 0 }}>
            {tweets
              .filter((_, i) => i % 2 === col)
              .map((tweet) => (
                <GalleryCard
                  key={tweet.id}
                  tweet={tweet}
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
