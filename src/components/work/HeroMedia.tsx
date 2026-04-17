"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";
import { WordReveal } from "@/components/work/WordReveal";

// Hero sits between the top (below header) and the filmstrip.
// These match the actual UI: header ~70px, filmstrip area ~160px.
const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 200;

// Hero box caps. Must stay in sync with the container style below.
// Mobile gets a wider viewport percentage since there's less horizontal room.
const HERO_W_MAX = 920;
const HERO_H_VH = 0.58;
const HERO_H_MAX = 580;

export default function HeroMedia({
  item,
  onVideoEnded,
  onVideoStarted,
  isMobile = false,
}: {
  item: TimelineItem;
  onVideoEnded: () => void;
  onVideoStarted?: () => void;
  isMobile?: boolean;
}) {
  const heroWidthVw = isMobile ? 0.9 : 0.68;
  const caption = item.kind === "media" ? item.text : null;

  // Track viewport to derive a sensible initial caption width before the media is measured.
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1600,
    h: typeof window !== "undefined" ? window.innerHeight : 900,
  }));
  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const heroMaxW = Math.min(heroWidthVw * viewport.w, HERO_W_MAX);
  const heroMaxH = Math.min(HERO_H_VH * viewport.h, HERO_H_MAX);

  // First-paint guess from metadata (may be wrong for letterboxed videos);
  // then overwritten by the real rendered width once the element lays out.
  let initialWidth = heroMaxW;
  if (item.kind === "media" && item.media.width && item.media.height) {
    const aspect = item.media.width / item.media.height;
    initialWidth = Math.min(heroMaxW, heroMaxH * aspect);
  }
  const [captionWidthPx, setCaptionWidthPx] = useState(initialWidth);
  // Reset to the metadata estimate whenever the item changes, then let the
  // ResizeObserver in MediaCard overwrite with the true rendered width.
  const itemKey = keyForItem(item);
  useEffect(() => {
    setCaptionWidthPx(initialWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey]);

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
          gap: 12,
        }}
      >
        {caption && item.kind === "media" && !isMobile && (
          <HeroCaption
            text={caption}
            itemKey={keyForItem(item)}
            widthPx={captionWidthPx}
            url={item.url}
          />
        )}
        <div
          style={{
            width: `min(${heroWidthVw * 100}vw, ${HERO_W_MAX}px)`,
            height: "min(58vh, 580px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderItem(item, onVideoEnded, onVideoStarted, setCaptionWidthPx)}
        </div>
      </div>
    </div>
  );
}

function HeroCaption({
  text,
  itemKey,
  widthPx,
  url,
}: {
  text: string;
  itemKey: string;
  widthPx: number;
  url: string;
}) {
  return (
    <a
      key={itemKey}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="lowercase text-white text-shadow"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: `${widthPx}px`,
        fontSize: "1rem",
        lineHeight: 1.5,
        textDecoration: "none",
        cursor: "none",
        opacity: 0,
        animation: "hero-caption-fade-in 0.35s ease-out 0.05s forwards",
      }}
    >
      <span
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {text}
      </span>
      <OpenIcon />
      <style jsx>{`
        @keyframes hero-caption-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </a>
  );
}

function OpenIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0, opacity: 0.9 }}
    >
      <path
        d="M4 3 H9 V8 M9 3 L3 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function keyForItem(item: TimelineItem): string {
  if (item.kind === "media") return `${item.tweetId}-${item.mediaIndex}`;
  return item.id;
}

function renderItem(
  item: TimelineItem,
  onVideoEnded: () => void,
  onVideoStarted?: () => void,
  onMeasureWidth?: (w: number) => void,
) {
  if (item.kind === "media") {
    return (
      <MediaCard
        item={item}
        onVideoEnded={onVideoEnded}
        onVideoStarted={onVideoStarted}
        onMeasureWidth={onMeasureWidth}
      />
    );
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
          {era.label} {era.years && <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: "12px" }}>{era.years}</span>}
        </h2>
        <WordReveal delay={60} key={item.id}>
          {era.content}
        </WordReveal>
        {era.city && (
          <p
            className="lowercase"
            style={{
              fontSize: "1.05rem",
              color: "rgba(255,255,255,0.5)",
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
      className="section-xpad story-card"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Mobile: bump the era/tldr/social paragraph text a notch — inline
          fontSize on each <p> needs !important to override. */}
      <style jsx global>{`
        @media (max-width: 767px) {
          .story-card p {
            font-size: 1.35rem !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}

function MediaCard({
  item,
  onVideoEnded,
  onVideoStarted,
  onMeasureWidth,
}: {
  item: Extract<TimelineItem, { kind: "media" }>;
  onVideoEnded: () => void;
  onVideoStarted?: () => void;
  onMeasureWidth?: (w: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const m = item.media;
  const isVideo = m.type === "video" || m.type === "animated_gif";

  // Measure the ACTUAL rendered width of the media element so the caption
  // can match the visible media (not the metadata-declared box, which can be
  // wrong when the file contains letterboxed content).
  useEffect(() => {
    const el = isVideo ? videoRef.current : imgRef.current;
    if (!el || !onMeasureWidth) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) onMeasureWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el instanceof HTMLImageElement) {
      el.addEventListener("load", measure);
    } else if (el instanceof HTMLVideoElement) {
      el.addEventListener("loadedmetadata", measure);
      el.addEventListener("loadeddata", measure);
    }
    return () => {
      ro.disconnect();
      if (el instanceof HTMLImageElement) el.removeEventListener("load", measure);
      if (el instanceof HTMLVideoElement) {
        el.removeEventListener("loadedmetadata", measure);
        el.removeEventListener("loadeddata", measure);
      }
    };
  }, [onMeasureWidth, isVideo, m.blobUrl]);

  if (!m.blobUrl) return null;

  const mediaStyle: React.CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.18))",
  };

  const reportWidth = (el: HTMLElement) => {
    const w = el.getBoundingClientRect().width;
    if (w > 0) onMeasureWidth?.(w);
  };

  const media = isVideo ? (
    <video
      ref={videoRef}
      key={m.blobUrl}
      src={m.blobUrl}
      muted
      playsInline
      autoPlay
      onPlay={onVideoStarted}
      onEnded={onVideoEnded}
      onLoadedMetadata={(e) => reportWidth(e.currentTarget)}
      onLoadedData={(e) => reportWidth(e.currentTarget)}
      style={mediaStyle}
      data-no-cursor-expand
    />
  ) : (
    <img
      ref={imgRef}
      src={m.blobUrl}
      alt={item.text}
      onLoad={(e) => reportWidth(e.currentTarget)}
      style={mediaStyle}
      data-no-cursor-expand
    />
  );

  // Hero is clickable — opens the original tweet on x.com in a new tab.
  // Anchor stretches to fill the constrained parent box so the image's
  // `max-width: 100%` resolves against the hero size (`min(68vw, 920px)`),
  // not against its own content.
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        cursor: "none",
      }}
    >
      {media}
    </a>
  );
}
