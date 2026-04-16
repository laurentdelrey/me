"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import type { TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";

export default function HeroMedia({
  item,
  onVideoEnded,
}: {
  item: TimelineItem;
  onVideoEnded: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={keyForItem(item)}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-auto"
          style={{
            maxWidth: "56vw",
            maxHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderItem(item, onVideoEnded)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function keyForItem(item: TimelineItem): string {
  if (item.kind === "media") return `${item.tweetId}-${item.mediaIndex}`;
  return item.id;
}

function renderItem(item: TimelineItem, onVideoEnded: () => void) {
  if (item.kind === "media") {
    return <MediaCard item={item} onVideoEnded={onVideoEnded} />;
  }

  if (item.kind === "tldr") {
    return (
      <StoryCard>
        <div style={{ maxWidth: "520px" }}>{ERAS.tldr.content}</div>
      </StoryCard>
    );
  }

  if (item.kind === "social") {
    return (
      <StoryCard>
        <div style={{ maxWidth: "520px" }}>{ERAS.social.content}</div>
      </StoryCard>
    );
  }

  // eraIntro
  const era = ERAS[item.eraId];
  return (
    <StoryCard>
      <div style={{ maxWidth: "520px" }}>
        <h2
          className="text-white lowercase text-shadow"
          style={{
            fontSize: "0.8rem",
            fontWeight: 500,
            marginBottom: "16px",
            color: era.color,
          }}
        >
          {era.label} {era.years && <span style={{ color: "#999999", marginLeft: "12px" }}>{era.years}</span>}
        </h2>
        {era.content}
        {era.city && (
          <p
            className="lowercase"
            style={{
              fontSize: "1.05rem",
              color: "#999999",
              marginTop: "16px",
            }}
          >
            {era.city}
          </p>
        )}
      </div>
    </StoryCard>
  );
}

function StoryCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="section-xpad"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function MediaCard({
  item,
  onVideoEnded,
}: {
  item: Extract<TimelineItem, { kind: "media" }>;
  onVideoEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const m = item.media;
  if (!m.blobUrl) return null;

  const isVideo = m.type === "video" || m.type === "animated_gif";

  const commonStyle: React.CSSProperties = {
    maxWidth: "56vw",
    maxHeight: "70vh",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    display: "block",
  };

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        key={m.blobUrl}
        src={m.blobUrl}
        muted
        playsInline
        autoPlay
        onEnded={onVideoEnded}
        style={commonStyle}
        data-no-cursor-expand
      />
    );
  }

  return (
    <img
      src={m.blobUrl}
      alt={item.text}
      style={commonStyle}
      data-no-cursor-expand
    />
  );
}
