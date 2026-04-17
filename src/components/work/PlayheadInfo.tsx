"use client";

import { useState } from "react";
import { SlidingNumber } from "@/../components/motion-primitives/sliding-number";

/**
 * Sits just above the filmstrip playhead.
 * Shows the date (always 1 line) and caption (1-line clamp by default,
 * expands to full text on hover).
 *
 * The cluster is anchored at its bottom edge so expansion grows *upward*
 * into empty air — never pushes the filmstrip or hero around.
 */

// Match Filmstrip constants (THUMB_H + STRIP_PAD*2) + breathing room
const FILMSTRIP_HEIGHT = 140 + 16 * 2; // 172
const GAP_ABOVE_FILMSTRIP = 20;

export default function PlayheadInfo({
  year,
  month,
  day,
  caption,
}: {
  year: number;
  month: number;
  day: number;
  caption: string | null;
}) {
  const [hovered, setHovered] = useState(false);

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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="text-white text-shadow"
        style={{
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // Grow upward: bottom of cluster is stable, content extends up.
          justifyContent: "flex-end",
          gap: 4,
          maxWidth: "min(60vw, 480px)",
          textAlign: "center",
        }}
      >
        {/* Caption above the date so it grows upward on hover */}
        {caption && (
          <div
            className="lowercase"
            style={{
              fontSize: "0.8rem",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.75)",
              // Default: clamp to 1 line. Hover: unclamp, show full text.
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: hovered ? "unset" : 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: hovered ? "normal" : "nowrap",
              transition: "color 0.2s ease",
              cursor: "default",
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
      </div>
    </div>
  );
}
