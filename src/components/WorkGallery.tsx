"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
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
      className="gallery-card group relative block overflow-hidden break-inside-avoid mb-0"
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

export default function WorkGallery({ onScrollYear }: { onScrollYear?: (year: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTweet, setHoveredTweet] = useState<Tweet | null>(null);
  const [visibleTweet, setVisibleTweet] = useState<Tweet | null>(null);
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

  const displayTweets = allTweets.filter((t) => !hiddenIds.has(t.id));

  // Spring-based tooltip position (same inertia feel as the cursor)
  const tooltipX = useMotionValue(0);
  const tooltipY = useMotionValue(0);
  const springConfig = { stiffness: 300, damping: 30 };
  const tooltipXSpring = useSpring(tooltipX, springConfig);
  const tooltipYSpring = useSpring(tooltipY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      tooltipX.set(e.clientX + 16);
      tooltipY.set(e.clientY + 16);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [tooltipX, tooltipY]);

  // Delayed tooltip content transition — show/hide with a small fade
  useEffect(() => {
    if (hoveredTweet) {
      setVisibleTweet(hoveredTweet);
    } else {
      const timeout = setTimeout(() => setVisibleTweet(null), 150);
      return () => clearTimeout(timeout);
    }
  }, [hoveredTweet]);

  // Report current year based on scroll position
  useEffect(() => {
    if (!onScrollYear || displayTweets.length === 0) return;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = containerRef.current.scrollHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / Math.max(1, totalHeight - window.innerHeight)));
      // Map progress to tweet index
      const idx = Math.min(displayTweets.length - 1, Math.floor(progress * displayTweets.length));
      const year = displayTweets[idx]?.date?.substring(0, 4) || "";
      onScrollYear(year);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onScrollYear, displayTweets]);

  // Keyboard shortcut: H to toggle hidden
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") {
        if (!hoveredTweet) return;
        e.preventDefault();
        const id = hoveredTweet.id;

        setHiddenIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
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
  }, [hoveredTweet]);


  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div
        style={{
          padding: "80px 12%",
          minHeight: "100vh",
          display: "flex",
          gap: "0px",
        }}
        className="gallery-grid"
      >
        {[0, 1].map((col) => (
          <div key={col} style={{ flex: 1, minWidth: 0 }}>
            {displayTweets
              .filter((_, i) => i % 2 === col)
              .map((tweet) => (
                <GalleryCard
                  key={tweet.id}
                  tweet={tweet}
                  onMouseEnter={() => setHoveredTweet(tweet)}
                  onMouseLeave={() => setHoveredTweet(null)}
                />
              ))}
          </div>
        ))}
      </div>

      {/* Cursor tooltip — spring-animated, follows mouse with inertia */}
      <motion.div
        className="fixed pointer-events-none z-50"
        style={{
          left: 0,
          top: 0,
          x: tooltipXSpring,
          y: tooltipYSpring,
          maxWidth: "260px",
          opacity: visibleTweet ? 1 : 0,
          transition: "opacity 0.15s ease-out",
        }}
      >
        {visibleTweet && (
          <div
            style={{
              background: "rgba(63, 45, 44, 0.9)",
              borderRadius: "8px",
              padding: "10px 12px",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.div
              key={visibleTweet.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-white/90 text-xs leading-relaxed lowercase line-clamp-3">
                {visibleTweet.text}
              </p>
              {visibleTweet.replies?.map((reply, i) => (
                <p
                  key={i}
                  className="text-white/40 text-xs leading-relaxed lowercase mt-1.5 line-clamp-2"
                >
                  ↳ {reply}
                </p>
              ))}
              <p className="text-white/25 text-xs mt-1.5">
                {formatDate(visibleTweet.date)}
              </p>
            </motion.div>
          </div>
        )}
      </motion.div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.gallery-grid) {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
