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

  // Per-tile entrance/exit stagger: tiles closer to the current item appear
  // first and disappear last, so the grid feels like it's rippling outward
  // from (and collapsing inward to) the hero. Computed in mosaic-local
  // coords; exact distances don't matter, just relative ordering.
  const stagger = useMemo(() => {
    if (tiles.length === 0) return new Map<string, number>();
    const current = tiles.find((t) => keyFor(t.item) === currentMediaKey);
    const cx = current
      ? current.x + current.w / 2
      : cw / 2;
    const cy = current
      ? current.y + current.h / 2
      : (totalHeight || ch) / 2;
    const maxDist = Math.hypot(cw, totalHeight || ch);
    const out = new Map<string, number>();
    for (const t of tiles) {
      const dx = t.x + t.w / 2 - cx;
      const dy = t.y + t.h / 2 - cy;
      const d = Math.hypot(dx, dy);
      out.set(keyFor(t.item), maxDist > 0 ? d / maxDist : 0);
    }
    return out;
  }, [tiles, currentMediaKey, cw, ch, totalHeight]);

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        inset: 0,
        // Block pointer events while hidden; per-tile opacity handles fades.
        pointerEvents: visible ? "auto" : "none",
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
            const isCurrent = currentMediaKey === k;
            const norm = stagger.get(k) ?? 0;
            // Entrance: tiles close to hero appear first; total spread ~600ms.
            // Exit: outer tiles leave first, inner last — feels like the
            // grid is collapsing toward the hero before it morphs back.
            const entranceDelay = norm * 0.55;
            const exitDelay = (1 - norm) * 0.3;
            return (
              <CanvasTile
                key={k}
                tile={tile}
                tiltDeg={tilt}
                jx={jx}
                jy={jy}
                isHovered={isHovered}
                hidden={isCurrent}
                visible={visible}
                entranceDelay={entranceDelay}
                exitDelay={exitDelay}
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
  visible,
  entranceDelay,
  exitDelay,
  onHoverStart,
  onHoverEnd,
  onClick,
}: {
  tile: MosaicTile;
  tiltDeg: number;
  jx: number;
  jy: number;
  isHovered: boolean;
  /** true for the current item — MorphHero floats in this slot. */
  hidden: boolean;
  /** true when the canvas is on (grid view). */
  visible: boolean;
  entranceDelay: number;
  exitDelay: number;
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
  // Outer wrapper handles position + entrance/exit (opacity, scale, y rise).
  // Inner wrapper handles hover/tilt (rotate, scale-up). Nesting them keeps
  // their transitions independent so the entrance stagger doesn't make
  // hover feel sluggish, and the snappy hover spring doesn't overwrite the
  // staggered fade-in.
  const inactive = !visible || hidden;
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: hidden ? 0 : visible ? 1 : 0,
        scale: visible ? 1 : 0.78,
        y: visible ? 0 : 18,
      }}
      transition={{
        duration: visible ? 0.45 : 0.32,
        delay: visible ? entranceDelay : exitDelay,
        ease: [0.32, 0.72, 0, 1],
      }}
      style={{
        position: "absolute",
        left: x + jx,
        top: y + jy,
        width: w,
        height: h,
        pointerEvents: inactive ? "none" : "auto",
        // Clip overflow so the rotated inner card doesn't leak during
        // entrance, but allow the hover scale to escape — handled by the
        // inner wrapper having no clip.
        willChange: "transform, opacity",
      }}
    >
      <motion.div
        onClick={onClick}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        data-no-cursor-expand
        animate={{
          rotate: isHovered ? 0 : tiltDeg,
          scale: isHovered ? previewScale : 1,
          zIndex: isHovered ? 50 : 1,
          boxShadow: isHovered
            ? "0 30px 80px rgba(0,0,0,0.35)"
            : "0 6px 18px rgba(0,0,0,0.18)",
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 28,
          mass: 0.6,
        }}
        style={{
          width: "100%",
          height: "100%",
          transformOrigin: "center center",
          cursor: hidden ? "default" : "none",
          overflow: "hidden",
          background: "#b0b0b0",
          borderRadius: 2,
          willChange: "transform",
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
    </motion.div>
  );
}
