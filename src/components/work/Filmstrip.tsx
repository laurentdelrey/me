"use client";

import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { TimelineItem } from "@/lib/work/timeline";

const THUMB_W = 140;
const THUMB_H = 90;
const STRIP_PAD = 16;
const ITEM_DURATION_MS = 2000; // how long one thumb takes to cross the playhead

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
  isPaused: boolean; // video playing, etc.
  onCurrentIndexChange: (idx: number) => void;
}) {
  // The strip owns a continuous `position` in units of thumb-widths.
  // currentIndex = round(position). The strip advances at a constant rate
  // unless paused (video) or hovering (locked to hovered thumb).
  const x = useMotionValue(0);
  const positionRef = useRef(0);
  const lastReportedRef = useRef(-1);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);

  const isHovering = hoverIndex !== null;
  const isHoveringRef = useRef(isHovering);
  const hoverIndexRef = useRef<number | null>(hoverIndex);
  const isPausedRef = useRef(isPaused);
  const timelineLenRef = useRef(timeline.length);

  // Keep refs in sync
  useEffect(() => {
    isHoveringRef.current = isHovering;
    hoverIndexRef.current = hoverIndex;
  }, [isHovering, hoverIndex]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    timelineLenRef.current = timeline.length;
  }, [timeline.length]);

  // Initialize x position on mount
  useEffect(() => {
    const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    x.set(centerX - 0 * THUMB_W - THUMB_W / 2);
  }, [x]);

  useEffect(() => {
    const tick = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;

      if (isHoveringRef.current && hoverIndexRef.current !== null) {
        // Ease position toward hoverIndex
        const target = hoverIndexRef.current;
        positionRef.current += (target - positionRef.current) * 0.25;
      } else if (!isPausedRef.current) {
        // Continuous advance
        positionRef.current += (dt * 1000) / ITEM_DURATION_MS;
        // Loop back to 0 at end
        if (positionRef.current > timelineLenRef.current - 1 + 0.5) {
          positionRef.current = 0;
        }
      }
      // (if paused and not hovering, position stays)

      // Clamp to valid range
      const pos = Math.max(
        0,
        Math.min(timelineLenRef.current - 1, positionRef.current)
      );
      positionRef.current = pos;

      // Drive X transform
      const targetX = centerX - pos * THUMB_W - THUMB_W / 2;
      x.set(targetX);

      // Emit currentIndex changes to parent
      const roundedIdx = Math.round(pos);
      if (roundedIdx !== lastReportedRef.current) {
        lastReportedRef.current = roundedIdx;
        onCurrentIndexChange(roundedIdx);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [x, onCurrentIndexChange]);

  // External control: wheel to seek
  useEffect(() => {
    let cooldown = false;
    let accum = 0;
    const THRESHOLD = 80;
    const onWheel = (e: WheelEvent) => {
      if (cooldown) return;
      accum += e.deltaY;
      if (Math.abs(accum) >= THRESHOLD) {
        const dir = accum > 0 ? 1 : -1;
        positionRef.current = Math.max(
          0,
          Math.min(timelineLenRef.current - 1, positionRef.current + dir)
        );
        accum = 0;
        cooldown = true;
        setTimeout(() => {
          cooldown = false;
        }, 150);
      }
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

      {/* Playhead — fixed vertical line */}
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
          position: "relative",
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
