"use client";

import { AnimatePresence, motion } from "motion/react";
import { ERAS, type EraId } from "@/lib/work/eras";

export default function EraLabel({ eraId }: { eraId: EraId | null }) {
  const era = eraId ? ERAS[eraId] : null;
  return (
    <div
      className="fixed"
      style={{
        left: 32,
        // Bottom-aligned with PlayheadInfo controls row
        // (bottom-gap 16 + filmstrip 124 + top-gap 16 = 156)
        bottom: 156,
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence mode="wait">
        {era && (
          <motion.div
            key={era.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div
              className="lowercase"
              style={{
                fontSize: "1rem",
                lineHeight: 1.3,
                fontWeight: 500,
                color: "#ffffff",
              }}
            >
              {era.label}
            </div>
            {era.city && (
              <div
                className="lowercase"
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.3,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 2,
                }}
              >
                {era.city}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
