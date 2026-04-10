"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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

function GalleryCard({ tweet }: { tweet: Tweet }) {
  const firstMedia = tweet.media[0];
  if (!firstMedia?.blobUrl) return null;

  const isVideo = firstMedia.type === "video";

  return (
    <a
      href={`https://x.com/laurentdelrey/status/${tweet.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden break-inside-avoid mb-4"
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

      {/* Hover overlay with tweet text + replies */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
        }}
      >
        {tweet.text && (
          <p className="text-white text-sm leading-relaxed lowercase line-clamp-4">
            {tweet.text}
          </p>
        )}

        {/* Self-replies (thread continuation) */}
        {tweet.replies?.map((reply, i) => (
          <p
            key={i}
            className="text-white/70 text-xs leading-relaxed lowercase mt-2 line-clamp-2"
          >
            ↳ {reply}
          </p>
        ))}

        <p className="text-white/40 text-xs mt-2">{formatDate(tweet.date)}</p>
      </div>
    </a>
  );
}

export default function WorkGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const visibleTweets = useMemo(
    () => (tweets as Tweet[]).filter((t) => !t.hidden && t.media[0]?.blobUrl),
    []
  );

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
          columnGap: "16px",
        }}
        className="masonry-grid"
      >
        {visibleTweets.map((tweet) => (
          <GalleryCard key={tweet.id} tweet={tweet} />
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
      `}</style>
    </div>
  );
}
