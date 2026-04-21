"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { MediaTimelineItem, TimelineItem } from "@/lib/work/timeline";

// Gap between tiles (px). Small so the mosaic feels packed.
const GAP = 6;

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
  // ~-1.8° .. +1.8°
  const tilt = ((h % 360) / 100) - 1.8;
  const jx = ((h >> 8) % 9) - 4; // -4px .. +4px
  const jy = ((h >> 16) % 9) - 4;
  return { tilt, jx, jy };
}

function keyFor(item: MediaTimelineItem): string {
  return `${item.tweetId}-${item.mediaIndex}`;
}

type Tile = {
  item: MediaTimelineItem;
  x: number;
  y: number;
  w: number;
  h: number;
};

// Justified mosaic (Flickr-style): greedy-pack rows at a target height, then
// scale each row to fill the container width exactly. One re-pass adjusts
// the target so the grid fits the available height as closely as possible.
function computeMosaic(
  items: MediaTimelineItem[],
  cw: number,
  ch: number,
): { tiles: Tile[]; totalHeight: number } {
  if (items.length === 0 || cw <= 0 || ch <= 0) {
    return { tiles: [], totalHeight: 0 };
  }

  const aspects = items.map((it) => {
    const w = it.media.width || 1;
    const h = it.media.height || 1;
    // Clamp extreme aspects so a single very-tall or very-wide item doesn't
    // dominate a row and push everything else off-screen.
    return Math.max(0.45, Math.min(2.6, w / h));
  });

  const pack = (rowHeight: number) => {
    type RowDraft = { items: MediaTimelineItem[]; widths: number[] };
    const rows: RowDraft[] = [];
    let curItems: MediaTimelineItem[] = [];
    let curWidths: number[] = [];
    let curSum = 0;

    const finalize = () => {
      if (curItems.length === 0) return;
      rows.push({ items: curItems, widths: curWidths });
      curItems = [];
      curWidths = [];
      curSum = 0;
    };

    for (let i = 0; i < items.length; i++) {
      const w = rowHeight * aspects[i];
      const gapsIfAdded = GAP * curItems.length; // gaps between items, not on edges
      if (curItems.length > 0 && curSum + w + gapsIfAdded > cw) {
        finalize();
      }
      curItems.push(items[i]);
      curWidths.push(w);
      curSum += w;
    }
    finalize();

    // Scale each row to fill the width exactly. The last row only scales if
    // it's nearly full — otherwise it would stretch a lonely final tile huge.
    const rowBlocks: { widths: number[]; height: number }[] = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const gaps = GAP * Math.max(0, row.items.length - 1);
      const sumW = row.widths.reduce((a, b) => a + b, 0);
      const fillRatio = (sumW + gaps) / cw;
      const isLast = r === rows.length - 1;
      const shouldScale = !isLast || fillRatio > 0.78;
      if (shouldScale) {
        const targetContent = cw - gaps;
        const scale = targetContent / sumW;
        rowBlocks.push({
          widths: row.widths.map((w) => w * scale),
          height: rowHeight * scale,
        });
      } else {
        rowBlocks.push({ widths: row.widths, height: rowHeight });
      }
    }

    const tiles: Tile[] = [];
    let y = 0;
    for (let r = 0; r < rowBlocks.length; r++) {
      const block = rowBlocks[r];
      const row = rows[r];
      let x = 0;
      for (let i = 0; i < row.items.length; i++) {
        tiles.push({
          item: row.items[i],
          x,
          y,
          w: block.widths[i],
          h: block.height,
        });
        x += block.widths[i] + GAP;
      }
      y += block.height + GAP;
    }
    const totalHeight = y - GAP;
    return { tiles, totalHeight };
  };

  // Initial target row height heuristic: sqrt(area-per-item) * tuning factor.
  // Then converge toward ch with one damped correction.
  let target = Math.sqrt((cw * ch) / items.length) * 0.9;
  let out = pack(target);
  for (let i = 0; i < 4; i++) {
    if (out.totalHeight <= 0) break;
    const ratio = ch / out.totalHeight;
    if (Math.abs(ratio - 1) < 0.01) break;
    target *= 1 + (ratio - 1) * 0.6;
    out = pack(target);
  }
  return out;
}

type CanvasProps = {
  timeline: TimelineItem[];
  currentIndex: number;
  onSelectItem: (timelineIndex: number) => void;
  visible: boolean;
  isMobile?: boolean;
};

export default function Canvas({
  timeline,
  currentIndex,
  onSelectItem,
  visible,
  isMobile = false,
}: CanvasProps) {
  // Media-only — cards (tl;dr, era intros, @ me) are narrative glue and
  // don't belong as tiles.
  const mediaWithIndex = useMemo(() => {
    const out: { item: MediaTimelineItem; timelineIndex: number }[] = [];
    for (let i = 0; i < timeline.length; i++) {
      const it = timeline[i];
      if (it.kind === "media") out.push({ item: it, timelineIndex: i });
    }
    return out;
  }, [timeline]);

  const items = useMemo(() => mediaWithIndex.map((m) => m.item), [mediaWithIndex]);

  // Insets: leave room for header (top) and breathing room around edges.
  const insetTop = isMobile ? 64 : 84;
  const insetBottom = isMobile ? 16 : 24;
  const insetSides = isMobile ? 12 : 24;

  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1400,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cw = Math.max(100, viewport.w - insetSides * 2);
  const ch = Math.max(100, viewport.h - insetTop - insetBottom);
  const { tiles, totalHeight } = useMemo(
    () => computeMosaic(items, cw, ch),
    [items, cw, ch],
  );

  // If the computed mosaic overshoots the target height (can happen with
  // exotic aspect combos), uniformly scale down so it still fits.
  const overflowScale = totalHeight > ch && totalHeight > 0 ? ch / totalHeight : 1;

  // Which tile the user is hovering — that one floats above, un-rotates, scales.
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
            return (
              <CanvasTile
                key={k}
                tile={tile}
                tiltDeg={tilt}
                jx={jx}
                jy={jy}
                isHovered={isHovered}
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
  onHoverStart,
  onHoverEnd,
  onClick,
}: {
  tile: Tile;
  tiltDeg: number;
  jx: number;
  jy: number;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}) {
  const { item, x, y, w, h } = tile;
  const m = item.media;
  const isVideo = m.type === "video" || m.type === "animated_gif";
  const videoRef = useRef<HTMLVideoElement>(null);

  // Hover: videos/gifs play in-place; pause when un-hovered.
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

  // Hovered tile grows up to a comfortable preview size (~3.2x) without
  // reshuffling neighbors. Scale is capped so it never exceeds a reasonable
  // fraction of the viewport.
  const previewScale = 3.2;
  const hoverScale = isHovered ? previewScale : 1;

  return (
    <motion.div
      layoutId={`hero-${keyFor(item)}`}
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
      }}
      initial={false}
      transition={{
        // Default for all sub-animations (rotate/scale/shadow on hover)
        type: "spring",
        stiffness: 260,
        damping: 28,
        mass: 0.6,
        // Layout (= the hero<->tile morph) uses an explicit duration + ease
        // so the timing matches between the two sides of the morph and the
        // motion is unmistakable.
        layout: { duration: 0.65, ease: [0.32, 0.72, 0, 1] },
      }}
      style={{
        position: "absolute",
        left: x + jx,
        top: y + jy,
        width: w,
        height: h,
        transformOrigin: "center center",
        cursor: "none",
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
  );
}
