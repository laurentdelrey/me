"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlidingNumber } from "@/../components/motion-primitives/sliding-number";

/**
 * Sits just above the filmstrip playhead as a single horizontal row:
 *   [ 2024 . 09 . 09 ]   [ ⏸ ]   [ 2× ]
 * Anchored at its bottom edge so it never pushes the filmstrip around.
 */

// Match Filmstrip constants (THUMB_H + STRIP_PAD*2)
const FILMSTRIP_HEIGHT = 140 + 16 * 2; // 172
const GAP_ABOVE_FILMSTRIP = 12;

export default function PlayheadInfo({
  year,
  month,
  day,
  isPlaying,
  onTogglePlaying,
  speed,
  onToggleSpeed,
}: {
  year: number;
  month: number;
  day: number;
  isPlaying: boolean;
  onTogglePlaying: () => void;
  speed: 1 | 2 | 10;
  onToggleSpeed: () => void;
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
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          className="tabular-nums"
          style={{
            fontSize: "0.8rem",
            fontWeight: 400,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <SlidingNumber value={year} />
          <span className="text-white/30">.</span>
          <SlidingNumber value={month} padStart />
          <span className="text-white/30">.</span>
          <SlidingNumber value={day} padStart />
        </div>

        <PlayPauseButton isPlaying={isPlaying} onToggle={onTogglePlaying} />

        <SpeedToggle speed={speed} onToggle={onToggleSpeed} />
      </div>
    </div>
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
    <motion.button
      onClick={onToggle}
      aria-label={isPlaying ? "Pause" : "Play"}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      style={{
        width: 20,
        height: 20,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#fff",
        padding: 0,
      }}
      data-no-cursor-expand
    >
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
    </motion.button>
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
