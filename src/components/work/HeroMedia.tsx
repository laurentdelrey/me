"use client";

import { useRef } from "react";
import type { TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";
import { WordReveal } from "@/components/work/WordReveal";

// Hero sits between the top (below header) and the filmstrip.
// These match the actual UI: header ~70px, filmstrip area ~160px.
const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 200;

export default function HeroMedia({
  item,
  onVideoEnded,
  onVideoStarted,
}: {
  item: TimelineItem;
  onVideoEnded: () => void;
  onVideoStarted?: () => void;
}) {
  const caption = item.kind === "media" ? item.text : null;

  return (
    <div
      className="fixed left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{
        top: TOP_MARGIN,
        bottom: BOTTOM_MARGIN,
        zIndex: 5,
      }}
    >
      <div
        key={keyForItem(item)}
        className="pointer-events-auto"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          maxWidth: "min(68vw, 920px)",
        }}
      >
        <div
          style={{
            width: "min(68vw, 920px)",
            height: "min(58vh, 580px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderItem(item, onVideoEnded, onVideoStarted)}
        </div>
        {caption && (
          <HeroCaption text={caption} itemKey={keyForItem(item)} />
        )}
      </div>
    </div>
  );
}

function HeroCaption({ text, itemKey }: { text: string; itemKey: string }) {
  return (
    <div
      key={itemKey}
      className="lowercase text-white text-shadow"
      style={{
        maxWidth: "min(68vw, 720px)",
        fontSize: "0.85rem",
        lineHeight: 1.5,
        textAlign: "center",
        opacity: 0,
        animation: "caption-fade-in 0.4s ease-out 0.1s forwards",
      }}
    >
      {text}
      <style jsx>{`
        @keyframes caption-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 0.85; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function keyForItem(item: TimelineItem): string {
  if (item.kind === "media") return `${item.tweetId}-${item.mediaIndex}`;
  return item.id;
}

function renderItem(item: TimelineItem, onVideoEnded: () => void, onVideoStarted?: () => void) {
  if (item.kind === "media") {
    return <MediaCard item={item} onVideoEnded={onVideoEnded} onVideoStarted={onVideoStarted} />;
  }

  if (item.kind === "tldr") {
    return (
      <StoryCard>
        <WordReveal delay={60} key={item.id}>
          <div style={{ maxWidth: "520px" }}>{ERAS.tldr.content}</div>
        </WordReveal>
      </StoryCard>
    );
  }

  if (item.kind === "social") {
    return (
      <StoryCard>
        <WordReveal delay={60} key={item.id}>
          <div style={{ maxWidth: "520px" }}>{ERAS.social.content}</div>
        </WordReveal>
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
            color: "#ffffff",
          }}
        >
          {era.label} {era.years && <span style={{ color: "#999999", marginLeft: "12px" }}>{era.years}</span>}
        </h2>
        <WordReveal delay={60} key={item.id}>
          {era.content}
        </WordReveal>
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
  onVideoStarted,
}: {
  item: Extract<TimelineItem, { kind: "media" }>;
  onVideoEnded: () => void;
  onVideoStarted?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const m = item.media;
  if (!m.blobUrl) return null;

  const isVideo = m.type === "video" || m.type === "animated_gif";

  const commonStyle: React.CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.25))",
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
        onPlay={onVideoStarted}
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
