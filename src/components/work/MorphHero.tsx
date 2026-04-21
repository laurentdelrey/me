"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import type { MediaTimelineItem } from "@/lib/work/timeline";
import type { Box } from "@/lib/work/hero-box";

const VIDEO_FAST_PLAYBACK_RATE = 3;

type Mode = "hero" | "tile";

/**
 * MorphHero is the single, always-mounted DOM element that renders the
 * current item's media. Its position/size animate between the hero box
 * (timeline mode) and its tile box (grid mode), so toggling views is one
 * smooth shape-change instead of two crossfading components.
 *
 * HeroMedia (for media items) and the current tile inside Canvas should
 * NOT render their own image — MorphHero owns it.
 */
export default function MorphHero({
  item,
  mode,
  heroBox,
  tileBox,
  speed = 1,
  onClickInGrid,
}: {
  item: MediaTimelineItem;
  mode: Mode;
  heroBox: Box;
  tileBox: Box | null;
  speed?: number;
  /** click handler when in grid mode (return to timeline at this item) */
  onClickInGrid?: () => void;
}) {
  const m = item.media;
  const isVideo = m.type === "video" || m.type === "animated_gif";
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return;
    el.playbackRate = speed > 1 ? VIDEO_FAST_PLAYBACK_RATE : 1;
  }, [speed, isVideo, m.blobUrl]);

  if (!m.blobUrl) return null;

  // In grid mode without a known tile (e.g., mosaic still computing), fall
  // back to the hero position so the element doesn't snap to (0, 0).
  const target =
    mode === "tile" && tileBox
      ? tileBox
      : heroBox;
  const inGrid = mode === "tile" && tileBox != null;

  // In hero mode, object-fit: contain keeps the full image visible (matches
  // what HeroMedia rendered before). In grid mode, object-fit: cover fills
  // the tile cleanly (matches Canvas tiles).
  const objectFit: React.CSSProperties["objectFit"] = inGrid ? "cover" : "contain";

  // Hero gets a soft drop shadow; tiles get a flatter card shadow.
  const dropShadow = inGrid
    ? "0 6px 18px rgba(0,0,0,0.18)"
    : "0 20px 60px rgba(0,0,0,0.18)";

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit,
    display: "block",
  };

  const handleClick = () => {
    if (inGrid && onClickInGrid) {
      onClickInGrid();
      return;
    }
    if (!inGrid) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{
        top: target.y,
        left: target.x,
        width: target.w,
        height: target.h,
        borderRadius: inGrid ? 2 : 0,
        boxShadow: dropShadow,
      }}
      transition={{
        // Single-curve morph that reads as one confident gesture.
        duration: 0.65,
        ease: [0.32, 0.72, 0, 1],
      }}
      onClick={handleClick}
      data-no-cursor-expand
      style={{
        position: "fixed",
        // Above the canvas grid (z:25) and the hero band (z:20). Filmstrip
        // and chrome stay above this via their own higher z-indices.
        zIndex: 27,
        overflow: "hidden",
        cursor: "none",
        background: inGrid ? "#b0b0b0" : "transparent",
        // Drop-shadow filter on the wrapper would clip object-fit:cover
        // weirdly during animation; box-shadow on the box is fine.
        willChange: "transform, top, left, width, height",
      }}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          key={m.blobUrl}
          src={m.blobUrl}
          muted
          playsInline
          autoPlay
          loop={inGrid}
          style={mediaStyle}
          data-no-cursor-expand
        />
      ) : (
        <img
          src={m.blobUrl}
          alt=""
          style={mediaStyle}
          data-no-cursor-expand
        />
      )}
    </motion.div>
  );
}
