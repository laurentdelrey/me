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

// Desktop: thumb 100 + pad 12 = 124. Mobile: thumb 72 + pad 8 = 88.
const FILMSTRIP_HEIGHT_DESKTOP = 100 + 12 * 2;
const FILMSTRIP_HEIGHT_MOBILE = 72 + 8 * 2;
const GAP_ABOVE_FILMSTRIP = 16;
const FILMSTRIP_BOTTOM_GAP = 16; // must match Filmstrip's `bottom: 16`

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
  isMobile = false,
}: {
  year: number;
  month: number;
  day: number;
  isPlaying: boolean;
  onTogglePlaying: () => void;
  speed: 1 | 10;
  onToggleSpeed: () => void;
  onBack: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  isMobile?: boolean;
}) {
  const bottomOffset =
    FILMSTRIP_BOTTOM_GAP +
    (isMobile ? FILMSTRIP_HEIGHT_MOBILE : FILMSTRIP_HEIGHT_DESKTOP) +
    GAP_ABOVE_FILMSTRIP;
  const edgeInset = isMobile ? 16 : 32;

  return (
    <>
      {/* Prev chapter — anchored to the left edge */}
      <div
        className="fixed pointer-events-none"
        style={{ left: edgeInset, bottom: bottomOffset, zIndex: 35 }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <ChapterButton
            side="prev"
            label={prevLabel}
            onClick={onBack}
            iconOnly={isMobile}
          />
        </div>
      </div>

      {/* Next chapter — anchored to the right edge */}
      <div
        className="fixed pointer-events-none"
        style={{ right: edgeInset, bottom: bottomOffset, zIndex: 35 }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <ChapterButton
            side="next"
            label={nextLabel}
            onClick={onNext}
            iconOnly={isMobile}
          />
        </div>
      </div>

      {/* Centered cluster — play/pause + date + speed, stays on the playhead */}
      <div
        className="fixed left-0 right-0 pointer-events-none"
        style={{
          bottom: bottomOffset,
          zIndex: 35,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className="text-white"
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 10 : 14,
          }}
        >
          <PlayPauseButton isPlaying={isPlaying} onToggle={onTogglePlaying} />
          <div
            className="tabular-nums playhead-text"
            style={{
              fontSize: "1rem",
              fontWeight: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              color: "#fff",
            }}
          >
            <SlidingNumber value={year} />
            <span className="text-white/30">.</span>
            <SlidingNumber value={month} padStart />
            <span className="text-white/30">.</span>
            <SlidingNumber value={day} padStart />
          </div>
          <SpeedToggle speed={speed} onToggle={onToggleSpeed} />
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 640px) {
          .playhead-text {
            font-size: 1.15rem !important;
          }
        }
      `}</style>
    </>
  );
}

// Shared pill chrome for all controls — matches the era-text pill links.
const PILL_HEIGHT = 32;
const pillBase: React.CSSProperties = {
  height: PILL_HEIGHT,
  borderRadius: 0,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.5)",
  color: "#fff",
  cursor: "none",
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
  iconOnly = false,
}: {
  side: "prev" | "next";
  label: string;
  onClick: () => void;
  iconOnly?: boolean;
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
      className="lowercase playhead-text"
      style={{
        ...pillBase,
        padding: iconOnly ? 0 : "0 12px",
        width: iconOnly ? 38 : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: iconOnly ? "center" : undefined,
        gap: 8,
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1,
      }}
      data-no-cursor-expand
    >
      {isPrev && <BackIcon />}
      {!iconOnly && (
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
      )}
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
  speed: 1 | 10;
  onToggle: () => void;
}) {
  return (
    <motion.button
      onClick={onToggle}
      aria-label={`Playback speed ${speed}×`}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="tabular-nums playhead-text"
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
