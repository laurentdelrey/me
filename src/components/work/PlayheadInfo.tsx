"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlidingNumber } from "@/../components/motion-primitives/sliding-number";

/**
 * Sits just above the filmstrip playhead. Music-player style row:
 *
 *        [⏮]  [⏸]   [ 2024 . 09 . 09 ]   [⏭]  [2×]
 *                     ^ centered on the playhead
 *
 * The date column is a fixed-width cell in the middle of a 1fr / auto / 1fr grid,
 * so its center always lines up with the playhead (which is the screen center).
 */

const FILMSTRIP_HEIGHT = 140 + 16 * 2; // matches Filmstrip
const GAP_ABOVE_FILMSTRIP = 16;

export default function PlayheadInfo({
  year,
  month,
  day,
  isPlaying,
  onTogglePlaying,
  speed,
  onToggleSpeed,
  onBack,
  onNext,
  prevLabel,
  nextLabel,
}: {
  year: number;
  month: number;
  day: number;
  isPlaying: boolean;
  onTogglePlaying: () => void;
  speed: 1 | 2 | 10;
  onToggleSpeed: () => void;
  onBack: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div
      className="fixed left-0 right-0 pointer-events-none"
      style={{
        bottom: FILMSTRIP_HEIGHT + GAP_ABOVE_FILMSTRIP,
        // Above Filmstrip (z-30) so the filmstrip's bleed shadow doesn't show behind the date.
        zIndex: 35,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="text-white text-shadow"
        style={{
          pointerEvents: "auto",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          columnGap: 18,
          // 1fr columns stay equal, so the auto (date) column is always screen-centered.
          // Wide enough to fit the longest chapter label at body-text size.
          width: 680,
        }}
      >
        {/* Left controls — previous chapter, then play/pause, pushed toward the date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <ChapterButton
            side="prev"
            label={prevLabel}
            onClick={onBack}
          />
          <PlayPauseButton isPlaying={isPlaying} onToggle={onTogglePlaying} />
        </div>

        {/* Date — centered, so its midpoint lines up with the playhead */}
        <div
          className="tabular-nums"
          style={{
            fontSize: "1rem",
            fontWeight: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <SlidingNumber value={year} />
          <span className="text-white/30">.</span>
          <SlidingNumber value={month} padStart />
          <span className="text-white/30">.</span>
          <SlidingNumber value={day} padStart />
        </div>

        {/* Right controls — next chapter, then speed toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 12,
          }}
        >
          <ChapterButton
            side="next"
            label={nextLabel}
            onClick={onNext}
          />
          <SpeedToggle speed={speed} onToggle={onToggleSpeed} />
        </div>
      </div>
    </div>
  );
}

// Shared pill chrome for all controls — matches the era-text pill links.
const PILL_HEIGHT = 32;
const pillBase: React.CSSProperties = {
  height: PILL_HEIGHT,
  borderRadius: 6,
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#fff",
  cursor: "pointer",
};

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      style={{
        ...pillBase,
        width: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
      data-no-cursor-expand
    >
      {children}
    </motion.button>
  );
}

function ChapterButton({
  side,
  label,
  onClick,
}: {
  side: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  // Empty label → no chapter to jump to (e.g. tldr has no meaningful "previous").
  if (!label) return null;
  const isPrev = side === "prev";
  return (
    <motion.button
      onClick={onClick}
      aria-label={isPrev ? `Previous chapter: ${label}` : `Next chapter: ${label}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="lowercase"
      style={{
        ...pillBase,
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1,
      }}
      data-no-cursor-expand
    >
      {isPrev && <BackIcon />}
      <span
        style={{
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {!isPrev && <NextIcon />}
    </motion.button>
  );
}

function PlayPauseButton({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <IconButton onClick={onToggle} ariaLabel={isPlaying ? "Pause" : "Play"}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isPlaying ? "pause" : "play"}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            transition: { type: "spring", stiffness: 650, damping: 22 },
          }}
          exit={{
            scale: 0.4,
            opacity: 0,
            transition: { duration: 0.08, ease: "easeIn" },
          }}
          style={{ display: "flex" }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}

function SpeedToggle({
  speed,
  onToggle,
}: {
  speed: 1 | 2 | 10;
  onToggle: () => void;
}) {
  return (
    <motion.button
      onClick={onToggle}
      aria-label={`Playback speed ${speed}×`}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="tabular-nums"
      style={{
        ...pillBase,
        minWidth: 46,
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1,
      }}
      data-no-cursor-expand
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={speed}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            transition: { type: "spring", stiffness: 650, damping: 22 },
          }}
          exit={{
            scale: 0.4,
            opacity: 0,
            transition: { duration: 0.08, ease: "easeIn" },
          }}
          style={{ display: "flex" }}
        >
          {speed}×
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 10 12" fill="currentColor" aria-hidden>
      <path d="M1 0.5L9 6L1 11.5V0.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 10 12" fill="currentColor" aria-hidden>
      <rect x="0.5" y="0.5" width="3" height="11" rx="0.5" />
      <rect x="6.5" y="0.5" width="3" height="11" rx="0.5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <rect x="0.5" y="1" width="2" height="10" rx="0.5" />
      <path d="M11.5 1.2L4 6L11.5 10.8V1.2Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M0.5 1.2L8 6L0.5 10.8V1.2Z" />
      <rect x="9.5" y="1" width="2" height="10" rx="0.5" />
    </svg>
  );
}
