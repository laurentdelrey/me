"use client";

import { AnimatePresence, motion } from "motion/react";
import { ERAS, type EraId } from "@/lib/work/eras";

export default function EraLabel({ eraId, isMobile = false }: { eraId: EraId | null; isMobile?: boolean }) {
  const era = eraId ? ERAS[eraId] : null;
  // Desktop: 16 + 124 + 16 = 156. Mobile: 16 + 88 + 16 = 120.
  const bottomOffset = isMobile ? 120 : 156;
  return (
    <div
      className="fixed"
      style={{
        left: isMobile ? 16 : 32,
        bottom: bottomOffset,
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
