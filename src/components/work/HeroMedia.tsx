"use client";

import { useEffect, useState } from "react";
import type { TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";
import { WordReveal } from "@/components/work/WordReveal";
import {
  HERO_TOP_MARGIN as TOP_MARGIN,
  HERO_BOTTOM_MARGIN as BOTTOM_MARGIN,
  computeHeroBox,
} from "@/lib/work/hero-box";

const HERO_W_MAX = 920;

/**
 * HeroMedia owns the chrome around the hero area:
 *   - For media items: only the caption (the image itself is rendered by
 *     MorphHero so it can morph into the grid tile).
 *   - For non-media items (tldr / era intros / @ me): the full card.
 */
export default function HeroMedia({
  item,
  isMobile = false,
}: {
  item: TimelineItem;
  // Kept for parent API compatibility; MorphHero now handles video lifecycle.
  onVideoEnded?: () => void;
  onVideoStarted?: () => void;
  isMobile?: boolean;
  speed?: number;
}) {
  const heroWidthVw = isMobile ? 0.9 : 0.68;

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

  // Caption width = the image's actual rendered width, derived from the same
  // hero-box math MorphHero uses, so the caption stays aligned with the
  // visible media without needing DOM measurement.
  let captionWidthPx = Math.min(heroWidthVw * viewport.w, HERO_W_MAX);
  if (item.kind === "media") {
    const box = computeHeroBox(item, viewport.w, viewport.h, isMobile);
    captionWidthPx = box.w;
  }

  return (
    <div
      className="fixed left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{
        top: TOP_MARGIN,
        bottom: BOTTOM_MARGIN,
        zIndex: 20,
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
        {item.kind === "media" && !isMobile && (
          <HeroCaption
            text={item.text}
            itemKey={keyForItem(item)}
            widthPx={captionWidthPx}
            url={item.url}
          />
        )}
        {item.kind !== "media" && (
          <div
            style={{
              width: `min(${heroWidthVw * 100}vw, ${HERO_W_MAX}px)`,
              height: "min(58vh, 580px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {renderCard(item)}
          </div>
        )}
        {item.kind === "media" && (
          // Spacer reserves the hero area's vertical real estate so the
          // caption stays parked at the top of the visible image. MorphHero
          // floats above this and supplies the actual visual.
          <div
            style={{
              width: 1,
              height: "min(58vh, 580px)",
              pointerEvents: "none",
            }}
          />
        )}
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

function renderCard(item: Exclude<TimelineItem, { kind: "media" }>) {
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

  const era = ERAS[item.eraId];
  return (
    <StoryCard>
      <div style={{ maxWidth: "520px" }}>
        <h2
          className="text-white lowercase text-shadow story-card-header"
          style={{
            fontSize: "1.125rem",
            fontWeight: 500,
            marginBottom: "16px",
            color: "#ffffff",
          }}
        >
          {era.label}{" "}
          {era.years && (
            <span
              style={{ color: "rgba(255,255,255,0.5)", marginLeft: "12px" }}
            >
              {era.years}
            </span>
          )}
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
      <style jsx global>{`
        @media (max-width: 767px) {
          .story-card p {
            font-size: 1.35rem !important;
            line-height: 1.6 !important;
          }
          .story-card-header {
            font-size: 1.35rem !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}
