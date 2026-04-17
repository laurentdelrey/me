"use client";

import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { TimelineItem } from "@/lib/work/timeline";

const THUMB_W = 140;
const THUMB_H = 140;
const STRIP_PAD = 16;
const IMAGE_DURATION_MS = 2000; // per image
const CARD_DURATION_MS = 7000; // tldr / era intro / social cards (more text, more time)
const MAX_VIDEO_DURATION_MS = 15000;

export default function Filmstrip({
  timeline,
  hoverIndex,
  onHoverItem,
  onLeave,
  onCurrentIndexChange,
  playing = true,
  speed = 1,
  seek,
}: {
  timeline: TimelineItem[];
  hoverIndex: number | null;
  onHoverItem: (idx: number) => void;
  onLeave: () => void;
  onCurrentIndexChange: (idx: number) => void;
  playing?: boolean;
  speed?: number;
  // A { index, nonce } pair. When `nonce` changes, the playhead jumps to `index`.
  // Nonce lets callers re-trigger the same index (e.g. clicking "back to start" twice).
  seek?: { index: number; nonce: number };
}) {
  // Start with the first thumb's LEFT edge at the playhead so the full tile
  // has time to travel under the playhead, not starting centered.
  const START_POSITION = -THUMB_W / 2;
  const initialX =
    typeof window !== "undefined" ? window.innerWidth / 2 - START_POSITION - THUMB_W / 2 : 0;
  const x = useMotionValue(initialX);
  const positionRef = useRef(START_POSITION);
  const rafRef = useRef<number | null>(null);
  const lastReportedRef = useRef(0);

  const hoverIndexRef = useRef<number | null>(hoverIndex);
  const lenRef = useRef(timeline.length);
  const timelineRef = useRef(timeline);
  const playingRef = useRef(playing);
  const hasStartedRef = useRef(false);
  const speedRef = useRef(speed);
  useEffect(() => { hoverIndexRef.current = hoverIndex; }, [hoverIndex]);
  useEffect(() => { lenRef.current = timeline.length; }, [timeline.length]);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  useEffect(() => {
    playingRef.current = playing;
    if (playing) hasStartedRef.current = true;
  }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Imperative seek: when the seek nonce changes, jump the playhead to seek.index.
  useEffect(() => {
    if (!seek) return;
    positionRef.current = seek.index * THUMB_W;
    hasStartedRef.current = true; // seeking implies intro is "over" — don't re-pin to start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek?.nonce]);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      const maxPosition = Math.max(0, (lenRef.current - 1) * THUMB_W);

      if (hoverIndexRef.current !== null) {
        // Lock to hovered thumb's center with gentle easing
        const target = hoverIndexRef.current * THUMB_W;
        positionRef.current += (target - positionRef.current) * 0.025;
      } else if (!playingRef.current) {
        // Before intro starts → pin to start. After that, pause in place.
        if (!hasStartedRef.current) {
          positionRef.current = START_POSITION;
        }
        // else: user paused — leave positionRef.current alone.
      } else {
        // Variable velocity: each item has a duration. The playhead traverses
        // THUMB_W pixels over that duration. Videos are slower; images go 2s each.
        const idx = Math.max(
          0,
          Math.min(lenRef.current - 1, Math.round(positionRef.current / THUMB_W))
        );
        const item = timelineRef.current[idx];
        let durationMs = IMAGE_DURATION_MS;
        if (item) {
          if (item.kind === "media") {
            const t = item.media.type;
            if (t === "video" || t === "animated_gif") {
              const d = item.media.durationMs ?? IMAGE_DURATION_MS;
              durationMs = Math.max(IMAGE_DURATION_MS, Math.min(MAX_VIDEO_DURATION_MS, d));
            }
          } else {
            // tldr, eraIntro, social — all text cards, give them more time
            durationMs = CARD_DURATION_MS;
          }
        }
        const pxPerSec = (THUMB_W / (durationMs / 1000)) * speedRef.current;
        positionRef.current += pxPerSec * dt;
        if (positionRef.current > maxPosition) positionRef.current = 0;
      }

      x.set(centerX - positionRef.current - THUMB_W / 2);

      const reportedIdx = Math.max(
        0,
        Math.min(lenRef.current - 1, Math.round(positionRef.current / THUMB_W))
      );
      if (reportedIdx !== lastReportedRef.current) {
        lastReportedRef.current = reportedIdx;
        onCurrentIndexChange(reportedIdx);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [x, onCurrentIndexChange]);

  // Wheel scrub
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      positionRef.current = Math.max(
        START_POSITION,
        Math.min((lenRef.current - 1) * THUMB_W, positionRef.current + e.deltaY * 0.5)
      );
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className="fixed left-0 right-0 bottom-0 pointer-events-none"
      style={{
        zIndex: 30,
        height: THUMB_H + STRIP_PAD * 2,
        overflow: "visible",
      }}
    >
      {/* Playhead — vertically aligned with the thumbs */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: "50%",
          bottom: STRIP_PAD - 6,
          transform: "translateX(-50%)",
          width: 2,
          height: THUMB_H + 12,
          background: "#ffffff",
          zIndex: 2,
          boxShadow: "0 0 10px rgba(255,255,255,0.6)",
        }}
      />

      <div
        className="hide-scrollbar"
        onMouseLeave={onLeave}
        style={{
          pointerEvents: "auto",
          overflow: "visible",
          width: "100%",
          padding: `${STRIP_PAD}px 0`,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Horizontal clip mask — only clips left/right via clip-path, lets the shadow bleed above */}
        <div
          style={{
            width: "100%",
            clipPath: `inset(-80px 0 -80px 0)`, // allow 80px of shadow above & below, clip horizontally
            WebkitClipPath: `inset(-80px 0 -80px 0)`,
          }}
        >
          <motion.div
            style={{
              display: "inline-flex",
              gap: 0,
              x,
              willChange: "transform",
              // Single soft shadow — transparent + big blur
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            {timeline.map((item, i) => (
              <FilmstripThumb
                key={keyForItem(item)}
                item={item}
                index={i}
                onHover={onHoverItem}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function keyForItem(item: TimelineItem): string {
  if (item.kind === "media") return `${item.tweetId}-${item.mediaIndex}`;
  return item.id;
}

function FilmstripThumb({
  item,
  index,
  onHover,
}: {
  item: TimelineItem;
  index: number;
  onHover: (idx: number) => void;
}) {
  const handleMouseEnter = () => onHover(index);

  if (item.kind === "media") {
    const m = item.media;
    if (!m.blobUrl) return null;
    const isVideo = m.type === "video" || m.type === "animated_gif";
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={handleMouseEnter}
        data-no-cursor-expand
        style={{
          flexShrink: 0,
          width: THUMB_W,
          height: THUMB_H,
          cursor: "none",
          display: "inline-block",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.9)",
        }}
      >
        <div style={{ width: "100%", height: "100%" }}>
          {isVideo ? (
            <video
              src={m.blobUrl}
              muted
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <img
              src={m.blobUrl}
              alt=""
              loading="eager"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>
      </a>
    );
  }

  const label =
    item.kind === "eraIntro"
      ? item.eraId === "meta"
        ? "meta"
        : item.eraId === "free"
        ? "free ideas"
        : item.eraId === "snap"
        ? "snap, inc."
        : item.eraId === "tribe"
        ? "a quest called tribe"
        : item.eraId === "hustle"
        ? "hustling for fun"
        : item.eraId === "lost"
        ? "lost in the game"
        : item.eraId === "kid"
        ? "another internet kid"
        : item.eraId
      : item.kind === "tldr"
      ? "tl;dr"
      : "@ me";

  return (
    <div
      onMouseEnter={handleMouseEnter}
      data-no-cursor-expand
      style={{
        flexShrink: 0,
        width: THUMB_W,
        height: THUMB_H,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "none",
        fontSize: "0.7rem",
        color: "#ffffff",
        textTransform: "lowercase",
        letterSpacing: "0.02em",
        textAlign: "center",
        padding: "0 6px",
        background: "#b0b0b0",
        borderRight: "1px solid rgba(255,255,255,0.9)",
        boxSizing: "border-box",
      }}
    >
      {label}
    </div>
  );
}
