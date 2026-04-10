"use client";

import { useEffect, useRef, useState } from "react";
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
      className="group relative block overflow-hidden"
      style={{ aspectRatio: `${firstMedia.width} / ${firstMedia.height}` }}
    >
      {isVideo ? (
        <video
          src={firstMedia.blobUrl}
          muted
          loop
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={firstMedia.blobUrl}
          alt={tweet.text}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      )}

      {/* Caption overlay */}
      {tweet.text && (
        <div
          className="absolute inset-x-0 bottom-0 p-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          <p className="text-white text-sm leading-relaxed line-clamp-3 lowercase">
            {tweet.text}
          </p>
          <p className="text-white/50 text-xs mt-1">{formatDate(tweet.date)}</p>
        </div>
      )}
    </a>
  );
}

export default function WorkGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

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
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
        style={{
          padding: "80px 12%",
          minHeight: "100vh",
        }}
      >
        {(tweets as Tweet[]).map((tweet) => (
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
    </div>
  );
}
