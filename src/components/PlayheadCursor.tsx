"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Custom cursor that follows the mouse and changes direction based on context.
 *
 * States:
 *   - idle: angled up-left (135°), like a standard cursor
 *   - ff:   pointing right (0°), when the user is hovering the right half of the filmstrip
 *   - rew:  pointing left (180°), when the user is hovering the left half of the filmstrip
 *
 * Detection is pure DOM: the cursor checks whether the mouse target sits inside an
 * element marked `data-filmstrip`, and uses the X position relative to screen center
 * to pick ff vs rew.
 */

type CursorMode = "idle" | "ff" | "rew";

const DEAD_ZONE_PX = 80; // centered band where we stay "idle" even over the strip

export function PlayheadCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 700, damping: 40, mass: 0.25 });
  const springY = useSpring(y, { stiffness: 700, damping: 40, mass: 0.25 });
  const [mode, setMode] = useState<CursorMode>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.body.style.cursor = "none";

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);

      const target = e.target as HTMLElement | null;
      const overStrip = !!target?.closest("[data-filmstrip]");

      if (overStrip) {
        const center = window.innerWidth / 2;
        if (e.clientX < center - DEAD_ZONE_PX) setMode("rew");
        else if (e.clientX > center + DEAD_ZONE_PX) setMode("ff");
        else setMode("idle");
      } else {
        setMode("idle");
      }
    };

    const onDocLeave = () => setVisible(false);
    const onDocEnter = () => setVisible(true);

    document.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onDocLeave);
    document.documentElement.addEventListener("mouseenter", onDocEnter);

    return () => {
      document.body.style.cursor = "auto";
      document.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onDocLeave);
      document.documentElement.removeEventListener("mouseenter", onDocEnter);
    };
  }, [x, y]);

  // Rotation: ff 0° (right), rew 180° (left), idle 225° (up-left — top-left cursor angle).
  // Note: SVG rotations are clockwise; 225° = -135° = pointing up-left.
  const rotation = mode === "ff" ? 0 : mode === "rew" ? 180 : 225;
  const isScrubbing = mode === "ff" || mode === "rew";

  return (
    <motion.div
      className="pointer-events-none fixed"
      style={{
        left: 0,
        top: 0,
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        zIndex: 9999,
      }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <motion.div
        animate={{ rotate: rotation }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="30"
          height="22"
          viewBox="0 0 22 16"
          fill="#ffffff"
          aria-hidden
        >
          {/* Shadow is applied per-path so it hugs each triangle shape — no separate asset feel. */}
          {/* Primary triangle — always visible. Points right in SVG; rotated by parent. */}
          <path
            d="M4 3 L10 8 L4 13 Z"
            style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.35))" }}
          />
          {/* Secondary triangle — appears only when scrubbing (ff/rew). */}
          <motion.path
            d="M11 3 L17 8 L11 13 Z"
            animate={{
              opacity: isScrubbing ? 1 : 0,
              x: isScrubbing ? 0 : -5,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.35))" }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
