"use client";

import { motion } from "motion/react";

type SiteHeaderProps = {
  visible?: boolean; // controls the right-side social block only
  topPaddingPx?: number;
  onClick?: () => void;
  color?: string;
};

export default function SiteHeader({
  visible = true,
  topPaddingPx = 16,
  onClick,
  color,
}: SiteHeaderProps) {
  return (
    <div
      className="fixed left-0 right-0 z-50 header-bar"
      style={{
        top: 0,
        pointerEvents: onClick ? "auto" : "none",
        paddingTop: topPaddingPx,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        columnGap: 16,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {/* Left column — empty spacer to keep the title centered on desktop.
          Hidden on mobile (see media query at the bottom). */}
      <div className="header-spacer" />

      <button
        className={`lowercase header-title ${onClick ? "cursor-pointer" : ""}`}
        style={{
          fontSize: "1rem",
          lineHeight: "1.5",
          fontWeight: 400,
          color: color || "#ffffff",
          transition: "color 0.5s ease",
          margin: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          pointerEvents: onClick ? "auto" : "none",
          justifySelf: "center",
        }}
        onClick={onClick}
        aria-label={onClick ? "Scroll to start" : undefined}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={(e) => {
          if (!onClick) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        laurent del rey
      </button>

      {/* Right-aligned social links — live in the same grid row as the title
          so they share the same vertical alignment. */}
      <div
        className="lowercase header-social"
        style={{
          justifySelf: "end",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "1rem",
          color: color || "#ffffff",
          pointerEvents: "auto",
          // Only the social block follows the idle-hide behavior;
          // the title stays on the page at all times.
          opacity: visible ? 1 : 0,
          transition: "opacity 500ms ease-out",
        }}
      >
        <span>on</span>
        <motion.a
          href="https://x.com/laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          style={socialPillStyle}
          data-no-cursor-expand
        >
          x
        </motion.a>
        <span>and</span>
        <motion.a
          href="https://www.threads.net/@laurentdelrey"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          style={socialPillStyle}
          data-no-cursor-expand
        >
          threads
        </motion.a>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          /* On mobile, anchor title left and social right — drop the
             centering spacer, restructure the grid to 2 cols. */
          :global(.header-bar) {
            grid-template-columns: auto 1fr !important;
          }
          :global(.header-spacer) {
            display: none !important;
          }
          :global(.header-title) {
            justify-self: start !important;
            grid-column: 1 !important;
          }
          :global(.header-social) {
            grid-column: 2 !important;
            gap: 8px !important;
            font-size: 1.05rem !important;
          }
        }
      `}</style>
    </Container>
  );
}

const socialPillStyle: React.CSSProperties = {
  color: "#fff",
  textDecoration: "none",
  display: "inline-block",
  padding: "0 8px",
  borderRadius: 4,
  background: "#b0b0b0",
  border: "1px solid rgba(255,255,255,0.2)",
  whiteSpace: "nowrap",
  lineHeight: 1.5,
  cursor: "none",
};

