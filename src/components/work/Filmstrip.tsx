"use client";

import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";

const THUMB_W = 140;
const THUMB_H = 90;
const STRIP_PAD = 16;

export default function Filmstrip({
  timeline,
  currentIndex,
  hoverIndex,
  onHoverItem,
  onLeave,
}: {
  timeline: TimelineItem[];
  currentIndex: number;
  hoverIndex: number | null;
  onHoverItem: (idx: number) => void;
  onLeave: () => void;
}) {
  // The strip is a continuously-moving film reel.
  // Position = currentIndex + (time-since-item-start / ITEM_DURATION) thumbs.
  // When autoplay advances, the transition is seamless. When hovering,
  // motion pauses and eases toward the hovered thumb.
  const x = useMotionValue(0);
  const rafRef = useRef<number | null>(null);
  const itemStartRef = useRef(performance.now());
  const isHovering = hoverIndex !== null;
  const initializedRef = useRef(false);

  const ITEM_DURATION_MS = 2000;

  // Reset item timer whenever currentIndex changes (only while not hovering)
  useEffect(() => {
    if (!isHovering) {
      itemStartRef.current = performance.now();
    }
  }, [currentIndex, isHovering]);

  // Initialize position immediately on mount (avoid initial ease-from-zero)
  useEffect(() => {
    if (initializedRef.current) return;
    const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    x.set(centerX - currentIndex * THUMB_W - THUMB_W / 2);
    initializedRef.current = true;
  }, [currentIndex, x]);

  useEffect(() => {
    const tick = (now: number) => {
      const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;

      if (isHovering) {
        // Ease toward the hovered thumb
        const target = centerX - currentIndex * THUMB_W - THUMB_W / 2;
        const cur = x.get();
        x.set(cur + (target - cur) * 0.25);
      } else {
        // Continuous forward motion: target moves at exactly THUMB_W per ITEM_DURATION_MS
        // No clamp — let it flow past the next boundary; when autoplay advances
        // currentIndex, itemStart resets and the position continues from where it was.
        const elapsed = (now - itemStartRef.current) / ITEM_DURATION_MS;
        const fracIndex = currentIndex + elapsed;
        const target = centerX - fracIndex * THUMB_W - THUMB_W / 2;
        x.set(target);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentIndex, isHovering, x]);

  return (
    <div
      className="fixed left-0 right-0 bottom-0 pointer-events-none"
      style={{ paddingBottom: 20, zIndex: 30 }}
    >
      {/* Soft shadow under the strip for elevation over the map */}
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

      {/* Playhead — fixed center vertical line over the strip */}
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

  // Era intro / tldr / social → chip with same width as thumbs
  const color = "#ffffff";
  const label =
    item.kind === "eraIntro"
      ? ERAS[item.eraId].label
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
        color,
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
