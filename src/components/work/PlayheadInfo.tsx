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
const GAP_ABOVE_FILMSTRIP = 12;

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
        zIndex: 25,
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
          columnGap: 14,
          // 1fr columns stay equal, so the auto (date) column is always screen-centered.
          // Needs to be wide enough to fit the longest chapter label ("a quest called tribe")
          // on each side without letting pills overlap the date.
          width: 520,
        }}
      >
        {/* Left controls — previous chapter, then play/pause, pushed toward the date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
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
            fontSize: "0.8rem",
            fontWeight: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
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
            gap: 10,
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
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      style={{
        width: 24,
        height: 20,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.28)",
        cursor: "pointer",
        color: "#fff",
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
  const isPrev = side === "prev";
  return (
    <motion.button
      onClick={onClick}
      aria-label={isPrev ? `Previous chapter: ${label}` : `Next chapter: ${label}`}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="lowercase"
      style={{
        height: 20,
        padding: "0 7px",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.28)",
        cursor: "pointer",
        color: "#fff",
        fontSize: "0.7rem",
        fontWeight: 500,
        lineHeight: 1,
      }}
      data-no-cursor-expand
    >
      {isPrev && <BackIcon />}
      <span
        style={{
          maxWidth: 110,
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
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="tabular-nums"
      style={{
        minWidth: 28,
        height: 20,
        padding: "0 6px",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.28)",
        cursor: "pointer",
        color: "#fff",
        fontSize: "0.7rem",
        fontWeight: 500,
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
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden>
      <path d="M1 0.5L9 6L1 11.5V0.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden>
      <rect x="0.5" y="0.5" width="3" height="11" rx="0.5" />
      <rect x="6.5" y="0.5" width="3" height="11" rx="0.5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <rect x="0.5" y="1" width="2" height="10" rx="0.5" />
      <path d="M11.5 1.2L4 6L11.5 10.8V1.2Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M0.5 1.2L8 6L0.5 10.8V1.2Z" />
      <rect x="9.5" y="1" width="2" height="10" rx="0.5" />
    </svg>
  );
}
