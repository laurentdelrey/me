"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import tweets from "@/data/tweets.json";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

type MediaItem = {
  type: string;
  localFile: string;
  width: number;
  height: number;
  durationMs?: number;
  blobUrl?: string;
};

type Tweet = {
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
  isHovered,
  isHidden,
  onMouseEnter,
  onMouseLeave,
}: {
  tweet: Tweet;
  isHovered: boolean;
  isHidden: boolean;
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
      className="gallery-card group relative block overflow-hidden break-inside-avoid mb-0"
      data-no-cursor-expand
      data-tweet-id={tweet.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ opacity: isHidden ? 0.15 : 1, transition: "opacity 0.3s" }}
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

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-end transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)",
          padding: "20px 16px",
          opacity: isHovered ? 1 : 0,
        }}
      >
        {tweet.text && (
          <p className="text-white text-sm leading-relaxed lowercase line-clamp-4">
            {tweet.text}
          </p>
        )}

        {/* Self-replies with staggered bubble-up */}
        {tweet.replies?.map((reply, i) => (
          <p
            key={i}
            className="text-white/60 text-xs leading-relaxed lowercase mt-2 line-clamp-2 reply-bubble"
            style={{
              animationDelay: `${300 + i * 200}ms`,
              opacity: 0,
              animation: isHovered
                ? `reply-bubble 0.3s ease-out ${300 + i * 200}ms forwards`
                : "none",
            }}
          >
            ↳ {reply}
          </p>
        ))}

        <p className="text-white/40 text-xs mt-2">{formatDate(tweet.date)}</p>
      </div>

      {/* Hidden badge */}
      {isHidden && (
        <div className="absolute top-2 right-2 bg-red-500/80 text-white text-xs px-2 py-0.5 rounded">
          hidden
        </div>
      )}
    </a>
  );
}

export default function WorkGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    const hidden = new Set<string>();
    for (const t of tweets as Tweet[]) {
      if (t.hidden) hidden.add(t.id);
    }
    return hidden;
  });

  const allTweets = useMemo(
    () => (tweets as Tweet[]).filter((t) => t.media[0]?.blobUrl),
    []
  );

  // Show hidden items too (dimmed) so you can un-hide them
  // But in production (no keyboard handler), hidden ones are filtered out
  const displayTweets = allTweets;

  // Keyboard shortcut: H to toggle hidden
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") {
        if (!hoveredId) return;
        e.preventDefault();

        setHiddenIds((prev) => {
          const next = new Set(prev);
          if (next.has(hoveredId)) {
            next.delete(hoveredId);
          } else {
            next.add(hoveredId);
          }
          // Log to console so we can grab the list
          console.log(
            "[WorkGallery] Hidden IDs:",
            JSON.stringify([...next])
          );
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hoveredId]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRef.current.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrolled = -rect.top;
      const totalScrollable = containerHeight - viewportHeight;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div
        style={{
          padding: "80px 12%",
          minHeight: "100vh",
          columnCount: 2,
          columnGap: "0px",
        }}
        className="masonry-grid"
      >
        {displayTweets.map((tweet) => (
          <GalleryCard
            key={tweet.id}
            tweet={tweet}
            isHovered={hoveredId === tweet.id}
            isHidden={hiddenIds.has(tweet.id)}
            onMouseEnter={() => setHoveredId(tweet.id)}
            onMouseLeave={() => setHoveredId(null)}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="fixed bottom-0 left-0 right-0 h-1 bg-gray-800/30 z-30"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="h-full bg-white transition-transform duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .masonry-grid {
            column-count: 1 !important;
          }
        }
        @keyframes reply-bubble {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 0.6;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
