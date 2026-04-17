"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlidingNumber } from "@/../components/motion-primitives/sliding-number";

/**
 * Sits just above the filmstrip playhead.
 * Shows: caption (1-line clamp), date, play/pause button.
 * The cluster is anchored at its bottom edge above the filmstrip.
 */

// Match Filmstrip constants (THUMB_H + STRIP_PAD*2)
const FILMSTRIP_HEIGHT = 140 + 16 * 2; // 172
const GAP_ABOVE_FILMSTRIP = 10;

export default function PlayheadInfo({
  year,
  month,
  day,
  caption,
  isPlaying,
  onTogglePlaying,
}: {
  year: number;
  month: number;
  day: number;
  caption: string | null;
  isPlaying: boolean;
  onTogglePlaying: () => void;
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
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          maxWidth: "min(60vw, 480px)",
          textAlign: "center",
        }}
      >
        {caption && (
          <div
            className="lowercase"
            style={{
              fontSize: "0.8rem",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.75)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {caption}
          </div>
        )}

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
        marginTop: 6,
        width: 24,
        height: 24,
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
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 22 }}
          style={{ display: "flex" }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
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
