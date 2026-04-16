"use client";

import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { TimelineItem } from "@/lib/work/timeline";

const THUMB_W = 140;
const THUMB_H = 90;
const STRIP_PAD = 16;
const PX_PER_SEC = 70; // 2s per thumb (140px / 2s = 70 px/s)

export default function Filmstrip({
  timeline,
  hoverIndex,
  onHoverItem,
  onLeave,
  isPaused,
  onCurrentIndexChange,
}: {
  timeline: TimelineItem[];
  hoverIndex: number | null;
  onHoverItem: (idx: number) => void;
  onLeave: () => void;
  isPaused: boolean;
  onCurrentIndexChange: (idx: number) => void;
}) {
  const x = useMotionValue(0);
  const positionRef = useRef(0); // in pixels — how far the strip has scrolled
  const rafRef = useRef<number | null>(null);
  const lastReportedRef = useRef(-1);

  // Keep live values in refs for the RAF loop
  const hoverIndexRef = useRef<number | null>(hoverIndex);
  const isPausedRef = useRef(isPaused);
  const lenRef = useRef(timeline.length);
  useEffect(() => { hoverIndexRef.current = hoverIndex; }, [hoverIndex]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { lenRef.current = timeline.length; }, [timeline.length]);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      const maxPosition = Math.max(0, (lenRef.current - 1) * THUMB_W);

      if (hoverIndexRef.current !== null) {
        // Lock to hovered thumb's center, eased
        const target = hoverIndexRef.current * THUMB_W;
        positionRef.current += (target - positionRef.current) * 0.2;
      } else if (!isPausedRef.current) {
        // Constant forward velocity
        positionRef.current += PX_PER_SEC * dt;
        if (positionRef.current > maxPosition) positionRef.current = 0; // loop
      }
      // If paused (video playing) and not hovering: position stays

      // Set strip X: center the current position under the playhead
      x.set(centerX - positionRef.current - THUMB_W / 2);

      // Report current index (whichever thumb is under the playhead)
      const idx = Math.round(positionRef.current / THUMB_W);
      const clamped = Math.max(0, Math.min(lenRef.current - 1, idx));
      if (clamped !== lastReportedRef.current) {
        lastReportedRef.current = clamped;
        onCurrentIndexChange(clamped);
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
        0,
        Math.min((lenRef.current - 1) * THUMB_W, positionRef.current + e.deltaY * 0.5)
      );
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className="fixed left-0 right-0 bottom-0 pointer-events-none"
      style={{ paddingBottom: 20, zIndex: 30 }}
    >
      {/* Soft shadow */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 8,
          height: THUMB_H + 40,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(10px)",
          zIndex: 0,
        }}
      />

      {/* Playhead */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: "50%",
          bottom: 20,
          transform: "translateX(-50%)",
          width: 2,
          height: THUMB_H + 20,
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
          overflow: "hidden",
          width: "100%",
          padding: `${STRIP_PAD}px 0`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div
          style={{
            display: "flex",
            gap: 0,
            x,
            willChange: "transform",
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
          overflow: "hidden",
          cursor: "none",
          display: "inline-block",
        }}
      >
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
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
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
        background: "rgba(0,0,0,0.3)",
      }}
    >
      {label}
    </div>
  );
}
