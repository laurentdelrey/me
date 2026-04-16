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
  // The strip continuously drifts toward the target position. Each frame we
  // nudge the current X toward the target (determined by currentIndex). If
  // we're close to the target, the strip is effectively "still sliding" but
  // only by a tiny amount — which creates the always-moving playhead feel.
  const x = useMotionValue(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(0);

  useEffect(() => {
    const computeTarget = () => {
      const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      targetRef.current = centerX - (currentIndex * THUMB_W + THUMB_W / 2);
    };
    computeTarget();
    window.addEventListener("resize", computeTarget);
    return () => window.removeEventListener("resize", computeTarget);
  }, [currentIndex]);

  // Continuous drift loop — always moving toward target, always tiny forward drift
  useEffect(() => {
    const FORWARD_DRIFT_PX_PER_SEC = -8; // negative = strip drifts left = time advances
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const current = x.get();
      const target = targetRef.current;
      const diff = target - current;
      // Pull toward target (spring-like)
      const pullSpeed = diff * 4; // pixels per second
      // Plus continuous slow drift so the strip is always moving even at target
      const next = current + (pullSpeed + FORWARD_DRIFT_PX_PER_SEC) * dt;
      // Clamp so drift doesn't run away past target when close
      if (Math.abs(diff) < 0.5 && Math.sign(FORWARD_DRIFT_PX_PER_SEC) === Math.sign(diff)) {
        x.set(target);
      } else {
        x.set(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [x]);

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
