"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineItem } from "@/lib/work/timeline";
import {
  computeMosaic,
  keyForMedia as keyFor,
  mediaItemsFromTimeline,
  mosaicLayoutFor,
  type MosaicTile,
} from "@/lib/work/mosaic";

type CanvasProps = {
  timeline: TimelineItem[];
  currentIndex: number;
  onSelectItem: (timelineIndex: number) => void;
  /** true = grid is on (fade in); false = fading out (parent will unmount soon) */
  visible: boolean;
  isMobile?: boolean;
};

/**
 * Justified-mosaic grid view. Clean, no decoration:
 *   - no tilt, no jitter — straight grid
 *   - no scatter / morph animation — plain crossfade with subtle stagger
 *   - tiles only mounted while parent says we're showing (`visible` true or
 *     fading out) so the timeline page never carries the cost
 *   - <video> elements are NOT mounted unless the tile is hovered; idle
 *     tiles render a flat placeholder. This was the main perf killer at
 *     ~200 tiles where every video preloaded metadata.
 *   - <img> uses loading="lazy" + decoding="async" so the browser can
 *     amortize work across frames.
 */
export default function Canvas({
  timeline,
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
        transition: "opacity 320ms ease-out",
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
          {tiles.map((tile, i) => {
            const k = keyFor(tile.item);
            const isHovered = hovered === k;
            // Tiny stagger so the grid feels intentional, not slammed in.
            // Capped total so even with many tiles we don't drag past the
            // wrapper's 320ms fade.
            const delay = Math.min(0.18, i * 0.004);
            return (
              <CanvasTile
                key={k}
                tile={tile}
                isHovered={isHovered}
                visible={visible}
                fadeDelay={delay}
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
  isHovered,
  visible,
  fadeDelay,
  onHoverStart,
  onHoverEnd,
  onClick,
}: {
  tile: MosaicTile;
  isHovered: boolean;
  visible: boolean;
  fadeDelay: number;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}) {
  const { item, x, y, w, h } = tile;
  const m = item.media;
  const isVideo = m.type === "video" || m.type === "animated_gif";
  const videoRef = useRef<HTMLVideoElement>(null);

  // Only mount the actual <video> element when the tile has been hovered at
  // least once. After that we keep it mounted (cheap) so re-hovering plays
  // immediately, but autoplay/pause is still gated by the current hover.
  const [activatedVideo, setActivatedVideo] = useState(false);
  useEffect(() => {
    if (isHovered && isVideo) setActivatedVideo(true);
  }, [isHovered, isVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activatedVideo) return;
    if (isHovered) {
      v.currentTime = 0;
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isHovered, activatedVideo]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      data-no-cursor-expand
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        cursor: "none",
        overflow: "hidden",
        background: "#9a9a9a",
        opacity: visible ? 1 : 0,
        transform: `scale(${isHovered ? 1.04 : 1})`,
        transformOrigin: "center center",
        zIndex: isHovered ? 10 : 1,
        boxShadow: isHovered
          ? "0 16px 36px rgba(0,0,0,0.28)"
          : "0 1px 2px rgba(0,0,0,0.10)",
        transition: [
          `opacity 320ms ease-out ${fadeDelay}s`,
          "transform 220ms ease-out",
          "box-shadow 220ms ease-out",
        ].join(", "),
        willChange: "opacity, transform",
      }}
    >
      {!isVideo && m.blobUrl && (
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
      {isVideo && (
        <>
          {!activatedVideo && (
            // Flat placeholder while the <video> is unmounted. A subtle
            // play glyph signals it's interactive without loading bytes.
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#7d7d7d",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden
              >
                <path d="M7 5 L17 11 L7 17 Z" fill="currentColor" />
              </svg>
            </div>
          )}
          {activatedVideo && m.blobUrl && (
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
        </>
      )}
    </div>
  );
}
