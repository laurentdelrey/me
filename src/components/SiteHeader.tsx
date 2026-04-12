"use client";

import { motion } from "framer-motion";

type SiteHeaderProps = {
  animated?: boolean;
  toTop?: boolean; // whether header should be at the top (true once map is ready)
  visible?: boolean;
  startY?: number; // starting offset from top when centered
  topPaddingPx?: number;
  onClick?: () => void; // optional click handler
  color?: string; // text color override
};

export default function SiteHeader({
  animated = false,
  toTop = true,
  visible = true,
  startY = 240,
  topPaddingPx = 16,
  onClick,
  color,
}: SiteHeaderProps) {
  const Container: any = animated ? motion.div : "div";

  return (
    <Container
      className="fixed left-0 right-0 z-30 flex items-center justify-center header-bar"
      style={{ top: 0, pointerEvents: onClick ? "auto" : "none", paddingTop: topPaddingPx }}
      {...(animated
        ? {
            initial: { y: startY, opacity: 0 },
            animate: { 
              y: toTop ? 0 : startY, 
              opacity: visible ? 1 : 0 
            },
            transition: {
              y: toTop ? { type: "spring", stiffness: 140, damping: 32, mass: 1 } : { duration: 0 },
              opacity: { duration: 0.5, ease: "easeOut" }
            },
          }
        : {})}
    >
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
    </Container>
  );
}

