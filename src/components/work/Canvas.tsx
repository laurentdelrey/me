"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { TimelineItem } from "@/lib/work/timeline";
import {
  computeMosaic,
  keyForMedia as keyFor,
  mediaItemsFromTimeline,
  mosaicLayoutFor,
  type MosaicTile,
} from "@/lib/work/mosaic";

// Deterministic per-item "hand-placed" jitter. Same item always gets the
// same rotation + offset across re-renders and page loads — feels composed,
// not random.
function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tiltFor(key: string): { tilt: number; jx: number; jy: number } {
  const h = hashKey(key);
  const tilt = ((h % 360) / 100) - 1.8;
  const jx = ((h >> 8) % 9) - 4;
  const jy = ((h >> 16) % 9) - 4;
  return { tilt, jx, jy };
}

type CanvasProps = {
  timeline: TimelineItem[];
  currentIndex: number;
  /** key of the current media item — its tile is hidden so MorphHero can occupy that slot. */
  currentMediaKey: string | null;
  onSelectItem: (timelineIndex: number) => void;
  visible: boolean;
  isMobile?: boolean;
};

export default function Canvas({
  timeline,
  currentMediaKey,
  onSelectItem,
  visible,
  isMobile = false,
}: CanvasProps) {
  const mediaWithIndex = useMemo(
    () => mediaItemsFromTimeline(timeline),
    [timeline],
  );

  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1400,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const layout = useMemo(
    () => mosaicLayoutFor(viewport.w, viewport.h, isMobile),
    [viewport.w, viewport.h, isMobile],
  );
  const { cw, ch, insetTop, insetSides } = layout;

  const { tiles, totalHeight, overflowScale } = useMemo(
    () => computeMosaic(mediaWithIndex, cw, ch),
    [mediaWithIndex, cw, ch],
  );

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: visible ? "auto" : "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease-out",
        zIndex: 25,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: insetTop,
          left: insetSides,
          width: cw,
          height: ch,
        }}
      >
        <div
          style={{
            position: "relative",
            width: cw,
            height: totalHeight * overflowScale,
            transform: `scale(${overflowScale})`,
            transformOrigin: "top left",
          }}
        >
          {tiles.map((tile) => {
            const k = keyFor(tile.item);
            const { tilt, jx, jy } = tiltFor(k);
            const isHovered = hovered === k;
            // Hide the current item's tile — MorphHero floats above and IS
            // the tile for that item. Keeping the slot in the layout (just
            // invisible) means the surrounding mosaic stays put.
            const isCurrent = currentMediaKey === k;
            return (
              <CanvasTile
                key={k}
                tile={tile}
                tiltDeg={tilt}
                jx={jx}
                jy={jy}
                isHovered={isHovered}
                hidden={isCurrent}
                onHoverStart={() => setHovered(k)}
                onHoverEnd={() =>
                  setHovered((cur) => (cur === k ? null : cur))
                }
                onClick={() => {
                  const entry = mediaWithIndex.find(
                    (m) => keyFor(m.item) === k,
                  );
                  if (entry) onSelectItem(entry.timelineIndex);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CanvasTile({
  tile,
  tiltDeg,
  jx,
  jy,
  isHovered,
  hidden,
  onHoverStart,
  onHoverEnd,
  onClick,
}: {
  tile: MosaicTile;
  tiltDeg: number;
  jx: number;
  jy: number;
  isHovered: boolean;
  hidden: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}) {
  const { item, x, y, w, h } = tile;
  const m = item.media;
  const isVideo = m.type === "video" || m.type === "animated_gif";
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    if (isHovered) {
      v.currentTime = 0;
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isHovered, isVideo]);

  const previewScale = 3.2;
  const hoverScale = isHovered ? previewScale : 1;

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      data-no-cursor-expand
      animate={{
        rotate: isHovered ? 0 : tiltDeg,
        scale: hoverScale,
        zIndex: isHovered ? 50 : 1,
        boxShadow: isHovered
          ? "0 30px 80px rgba(0,0,0,0.35)"
          : "0 6px 18px rgba(0,0,0,0.18)",
        opacity: hidden ? 0 : 1,
      }}
      initial={false}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28,
        mass: 0.6,
        opacity: { duration: 0.18, ease: "linear" },
      }}
      style={{
        position: "absolute",
        left: x + jx,
        top: y + jy,
        width: w,
        height: h,
        transformOrigin: "center center",
        cursor: hidden ? "default" : "none",
        overflow: "hidden",
        background: "#b0b0b0",
        borderRadius: 2,
        willChange: "transform",
        // Avoid intercepting clicks while hidden — MorphHero handles them.
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      {m.blobUrl && !isVideo && (
        <img
          src={m.blobUrl}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
      {m.blobUrl && isVideo && (
        <video
          ref={videoRef}
          src={m.blobUrl}
          muted
          playsInline
          loop
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
    </motion.div>
  );
}
