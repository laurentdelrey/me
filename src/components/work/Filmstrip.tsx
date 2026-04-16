"use client";

import { useEffect, useRef } from "react";
import type { TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";

const THUMB_W = 96;
const THUMB_H = 64;
const THUMB_GAP = 4;
const ERA_CHIP_W = 80;

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
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<Array<HTMLDivElement | null>>([]);

  // Center the current thumb
  useEffect(() => {
    const el = thumbsRef.current[currentIndex];
    const strip = stripRef.current;
    if (!el || !strip) return;
    const stripRect = strip.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const targetScrollLeft =
      strip.scrollLeft + (elRect.left - stripRect.left) - stripRect.width / 2 + elRect.width / 2;
    strip.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, [currentIndex]);

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-30 pointer-events-none"
      style={{ paddingBottom: 20 }}
    >
      <div
        ref={stripRef}
        className="hide-scrollbar"
        onMouseLeave={onLeave}
        style={{
          pointerEvents: "auto",
          overflowX: "auto",
          overflowY: "hidden",
          whiteSpace: "nowrap",
          padding: `8px 50vw`,
          display: "flex",
          gap: THUMB_GAP,
          alignItems: "center",
          scrollBehavior: "auto",
        }}
      >
        {timeline.map((item, i) => (
          <FilmstripThumb
            key={keyForItem(item)}
            item={item}
            index={i}
            isActive={i === currentIndex}
            isHovered={i === hoverIndex}
            onHover={onHoverItem}
            thumbRef={(el) => {
              thumbsRef.current[i] = el;
            }}
          />
        ))}
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
  isActive,
  isHovered,
  onHover,
  thumbRef,
}: {
  item: TimelineItem;
  index: number;
  isActive: boolean;
  isHovered: boolean;
  onHover: (idx: number) => void;
  thumbRef: (el: HTMLDivElement | null) => void;
}) {
  const handleMouseEnter = () => onHover(index);

  if (item.kind === "media") {
    const m = item.media;
    if (!m.blobUrl) return null;
    const isVideo = m.type === "video" || m.type === "animated_gif";
    return (
      <a
        ref={thumbRef as any}
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
          opacity: isActive || isHovered ? 1 : 0.55,
          outline: isActive ? "1.5px solid rgba(255,255,255,0.9)" : isHovered ? "1.5px solid rgba(255,255,255,0.45)" : "none",
          transition: "opacity 150ms ease, outline-color 150ms ease",
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

  // Era intro / tldr / social → small chip
  const color = item.kind === "eraIntro" ? ERAS[item.eraId].color : "#ffffff";
  const label =
    item.kind === "eraIntro"
      ? ERAS[item.eraId].label
      : item.kind === "tldr"
      ? "tl;dr"
      : "@ me";

  return (
    <div
      ref={thumbRef}
      onMouseEnter={handleMouseEnter}
      data-no-cursor-expand
      style={{
        flexShrink: 0,
        width: ERA_CHIP_W,
        height: THUMB_H,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "none",
        opacity: isActive || isHovered ? 1 : 0.55,
        outline: isActive ? "1.5px solid rgba(255,255,255,0.9)" : isHovered ? "1.5px solid rgba(255,255,255,0.45)" : "1px dashed rgba(255,255,255,0.15)",
        transition: "opacity 150ms ease, outline-color 150ms ease",
        fontSize: "0.7rem",
        color,
        textTransform: "lowercase",
        letterSpacing: "0.02em",
        textAlign: "center",
        padding: "0 6px",
      }}
    >
      {label}
    </div>
  );
}
