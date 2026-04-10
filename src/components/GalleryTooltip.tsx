"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

type Tweet = {
  id: string;
  date: string;
  text: string;
  replies?: string[];
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function GalleryTooltip({ tweet }: { tweet: Tweet | null }) {
  const [visibleTweet, setVisibleTweet] = useState<Tweet | null>(null);

  const tooltipX = useMotionValue(0);
  const tooltipY = useMotionValue(0);
  const springConfig = { stiffness: 300, damping: 30 };
  const tooltipXSpring = useSpring(tooltipX, springConfig);
  const tooltipYSpring = useSpring(tooltipY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      tooltipX.set(e.clientX + 16);
      tooltipY.set(e.clientY + 16);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [tooltipX, tooltipY]);

  useEffect(() => {
    if (tweet) {
      setVisibleTweet(tweet);
    } else {
      const timeout = setTimeout(() => setVisibleTweet(null), 150);
      return () => clearTimeout(timeout);
    }
  }, [tweet]);

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{
        left: 0,
        top: 0,
        x: tooltipXSpring,
        y: tooltipYSpring,
        maxWidth: "260px",
        opacity: visibleTweet ? 1 : 0,
        transition: "opacity 0.15s ease-out",
      }}
    >
      {visibleTweet && (
        <div
          style={{
            background: "rgba(63, 45, 44, 0.95)",
            borderRadius: 0,
            padding: "10px 12px",
            border: "0.5px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          <motion.div
            key={visibleTweet.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-white/90 text-xs leading-relaxed lowercase line-clamp-3">
              {visibleTweet.text}
            </p>
            {visibleTweet.replies?.map((reply, i) => (
              <p
                key={i}
                className="text-white/40 text-xs leading-relaxed lowercase mt-1.5 line-clamp-2"
              >
                ↳ {reply}
              </p>
            ))}
            <p className="text-white/25 text-xs mt-1.5">
              {formatDate(visibleTweet.date)}
            </p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
