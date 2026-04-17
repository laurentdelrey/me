"use client";

import { motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { TimelineItem } from "@/lib/work/timeline";

const THUMB_W_DESKTOP = 100;
const THUMB_W_MOBILE = 72;
const STRIP_PAD_DESKTOP = 12;
const STRIP_PAD_MOBILE = 8;
// Center band where hover does NOT scrub, so the user can click to select
// the thumb under the cursor. Outside this band, hover triggers ff/rew scrub.
const HOVER_DEAD_ZONE_PX = 250;
const IMAGE_DURATION_MS = 2000; // per image
const CARD_DURATION_MS = 7000; // tldr / era intro / social cards (more text, more time)
const MAX_VIDEO_DURATION_MS = 15000;

export default function Filmstrip({
  timeline,
  hoverIndex,
  onHoverItem,
  onLeave,
  onCurrentIndexChange,
  onSelectItem,
  currentIndex = 0,
  playing = true,
  speed = 1,
  seek,
  isMobile = false,
}: {
  timeline: TimelineItem[];
  hoverIndex: number | null;
  onHoverItem: (idx: number) => void;
  onLeave: () => void;
  onCurrentIndexChange: (idx: number) => void;
  onSelectItem?: (idx: number) => void;
  currentIndex?: number;
  playing?: boolean;
  speed?: number;
  // A { index, nonce } pair. When `nonce` changes, the playhead jumps to `index`.
  // Nonce lets callers re-trigger the same index (e.g. clicking "back to start" twice).
  seek?: { index: number; nonce: number };
  isMobile?: boolean;
}) {
  const THUMB_W = isMobile ? THUMB_W_MOBILE : THUMB_W_DESKTOP;
  const THUMB_H = THUMB_W;
  const STRIP_PAD = isMobile ? STRIP_PAD_MOBILE : STRIP_PAD_DESKTOP;
  // Start with the first thumb's LEFT edge at the playhead so the full tile
  // has time to travel under the playhead, not starting centered.
  const START_POSITION = -THUMB_W / 2;
  const initialX =
    typeof window !== "undefined" ? window.innerWidth / 2 - START_POSITION - THUMB_W / 2 : 0;
  const x = useMotionValue(initialX);
  const positionRef = useRef(START_POSITION);
  const rafRef = useRef<number | null>(null);
  const lastReportedRef = useRef(0);

  const hoverIndexRef = useRef<number | null>(hoverIndex);
  const lenRef = useRef(timeline.length);
  const timelineRef = useRef(timeline);
  const playingRef = useRef(playing);
  const hasStartedRef = useRef(false);
  const speedRef = useRef(speed);
  useEffect(() => { hoverIndexRef.current = hoverIndex; }, [hoverIndex]);
  useEffect(() => { lenRef.current = timeline.length; }, [timeline.length]);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  useEffect(() => {
    playingRef.current = playing;
    if (playing) hasStartedRef.current = true;
  }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Imperative seek: when the seek nonce changes, smoothly animate to seek.index.
  // Instead of snapping, we ease from the current position to the target over SEEK_DURATION_MS.
  const seekAnimRef = useRef<
    | { from: number; to: number; startTime: number; duration: number }
    | null
  >(null);
  useEffect(() => {
    if (!seek) return;
    const target = seek.index * THUMB_W;
    const distance = Math.abs(target - positionRef.current);
    // Longer distance → slightly longer animation, but clamp to a sane range.
    const duration = Math.max(450, Math.min(900, 300 + distance * 0.3));
    seekAnimRef.current = {
      from: positionRef.current,
      to: target,
      startTime: performance.now(),
      duration,
    };
    hasStartedRef.current = true; // seeking implies intro is "over" — don't re-pin to start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek?.nonce]);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      const maxPosition = Math.max(0, (lenRef.current - 1) * THUMB_W);

      if (seekAnimRef.current) {
        // Ease-out cubic from `from` to `to` over `duration` ms.
        const { from, to, startTime, duration } = seekAnimRef.current;
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        positionRef.current = from + (to - from) * eased;
        if (t >= 1) {
          positionRef.current = to;
          seekAnimRef.current = null;
        }
      } else if (hoverIndexRef.current !== null) {
        // Lock to hovered thumb's center with gentle easing
        const target = hoverIndexRef.current * THUMB_W;
        positionRef.current += (target - positionRef.current) * 0.025;
      } else if (!playingRef.current) {
        // Before intro starts → pin to start. After that, pause in place.
        if (!hasStartedRef.current) {
          positionRef.current = START_POSITION;
        }
        // else: user paused — leave positionRef.current alone.
      } else {
        // Variable velocity: each item has a duration. The playhead traverses
        // THUMB_W pixels over that duration. Videos are slower; images go 2s each.
        const idx = Math.max(
          0,
          Math.min(lenRef.current - 1, Math.round(positionRef.current / THUMB_W))
        );
        const item = timelineRef.current[idx];
        let durationMs = IMAGE_DURATION_MS;
        if (item) {
          if (item.kind === "media") {
            const t = item.media.type;
            if (t === "video" || t === "animated_gif") {
              const d = item.media.durationMs ?? IMAGE_DURATION_MS;
              durationMs = Math.max(IMAGE_DURATION_MS, Math.min(MAX_VIDEO_DURATION_MS, d));
            }
          } else {
            // tldr, eraIntro, social — all text cards, give them more time
            durationMs = CARD_DURATION_MS;
          }
        }
        const pxPerSec = (THUMB_W / (durationMs / 1000)) * speedRef.current;
        positionRef.current += pxPerSec * dt;
        if (positionRef.current > maxPosition) positionRef.current = 0;
      }

      x.set(centerX - positionRef.current - THUMB_W / 2);

      const reportedIdx = Math.max(
        0,
        Math.min(lenRef.current - 1, Math.round(positionRef.current / THUMB_W))
      );
      if (reportedIdx !== lastReportedRef.current) {
        lastReportedRef.current = reportedIdx;
        onCurrentIndexChange(reportedIdx);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [x, onCurrentIndexChange]);

  // Touch scrub (mobile) — dragging the strip moves the playhead.
  useEffect(() => {
    if (!isMobile) return;
    let startX = 0;
    let startPos = 0;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startPos = positionRef.current;
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      // Drag right → content moves right → position decreases (back in time)
      positionRef.current = Math.max(
        0,
        Math.min((lenRef.current - 1) * THUMB_W, startPos - dx),
      );
    };
    const el = document.querySelector('[data-filmstrip]');
    if (!el) return;
    el.addEventListener('touchstart', onStart as EventListener, { passive: true });
    el.addEventListener('touchmove', onMove as EventListener, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart as EventListener);
      el.removeEventListener('touchmove', onMove as EventListener);
    };
  }, [isMobile, THUMB_W]);

  // Wheel scrub
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      positionRef.current = Math.max(
        START_POSITION,
        Math.min((lenRef.current - 1) * THUMB_W, positionRef.current + e.deltaY * 0.5)
      );
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className="fixed left-0 right-0 pointer-events-none"
      data-filmstrip
      style={{
        // Mirror the gap above the filmstrip (16px between filmstrip top
        // and controls) below it as well — visually balanced.
        bottom: 16,
        zIndex: 30,
        height: THUMB_H + STRIP_PAD * 2,
        overflow: "visible",
      }}
    >
      {/* Playhead — vertically aligned with the thumbs */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: "50%",
          bottom: STRIP_PAD - 6,
          transform: "translateX(-50%)",
          width: 2,
          height: THUMB_H + 12,
          background: "#ffffff",
          zIndex: 2,
          boxShadow: "0 0 12px rgba(0,0,0,0.35)",
        }}
      />

      <div
        className="hide-scrollbar"
        onMouseLeave={onLeave}
        onMouseMove={(e) => {
          // If the cursor drifts into the center dead zone, stop scrubbing
          // so clicks land on the thumb under the cursor.
          const centerX = window.innerWidth / 2;
          if (Math.abs(e.clientX - centerX) < HOVER_DEAD_ZONE_PX) {
            onLeave();
          }
        }}
        style={{
          pointerEvents: "auto",
          overflow: "visible",
          width: "100%",
          padding: `${STRIP_PAD}px 0`,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Horizontal clip mask — allows the shadow to bleed above/below,
            while still clipping the thumb strip horizontally at viewport edges. */}
        <div
          style={{
            width: "100%",
            clipPath: `inset(-80px 0 -80px 0)`,
            WebkitClipPath: `inset(-80px 0 -80px 0)`,
          }}
        >
          <motion.div
            style={{
              display: "inline-flex",
              gap: 0,
              x,
              willChange: "transform",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            {timeline.map((item, i) => (
              <FilmstripThumb
                key={keyForItem(item)}
                item={item}
                index={i}
                onHover={onHoverItem}
                onSelect={onSelectItem}
                width={THUMB_W}
                height={THUMB_H}
                // Load media for thumbs within 3 slots of the playhead — far
                // enough ahead/behind that the next-visible thumb is ready,
                // cheap enough to not flood the network.
                shouldLoad={Math.abs(i - currentIndex) <= 3}
              />
            ))}
          </motion.div>
        </div>
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
  onSelect,
  shouldLoad = false,
  width,
  height,
}: {
  item: TimelineItem;
  index: number;
  onHover: (idx: number) => void;
  onSelect?: (idx: number) => void;
  shouldLoad?: boolean;
  width: number;
  height: number;
}) {
  const [loaded, setLoaded] = useState(false);
  // Only scrub-on-hover when the cursor is outside the center dead zone.
  // Inside it, leaving hoverIndex null lets the playhead stay put so the user
  // can click the thumb to select it.
  const handleMouseEnter = (e: React.MouseEvent) => {
    const centerX = window.innerWidth / 2;
    if (Math.abs(e.clientX - centerX) < HOVER_DEAD_ZONE_PX) return;
    onHover(index);
  };
  const handleClick = () => onSelect?.(index);

  if (item.kind === "media") {
    const m = item.media;
    if (!m.blobUrl) return null;
    const isVideo = m.type === "video" || m.type === "animated_gif";
    return (
      <div
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        data-no-cursor-expand
        style={{
          flexShrink: 0,
          width,
          height,
          cursor: "none",
          display: "inline-block",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            background: "#888",
          }}
        >
          {isVideo ? (
            // Videos only load near the playhead — preloading all 45 at once
            // choked the network and caused the original page-load lag.
            <video
              src={shouldLoad ? m.blobUrl : undefined}
              muted
              playsInline
              preload={shouldLoad ? "metadata" : "none"}
              onLoadedData={() => setLoaded(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: loaded ? 1 : 0,
                transition: "opacity 0.4s ease-out",
              }}
            />
          ) : (
            <img
              src={m.blobUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: loaded ? 1 : 0,
                transition: "opacity 0.4s ease-out",
              }}
            />
          )}
        </div>
      </div>
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
      onClick={handleClick}
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
        background: "#b0b0b0",
        borderRight: "1px solid rgba(255,255,255,0.25)",
        boxSizing: "border-box",
      }}
    >
      {label}
    </div>
  );
}
