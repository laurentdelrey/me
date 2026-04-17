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
        bottom: 220,
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
                fontSize: "0.8rem",
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
                  fontSize: "0.75rem",
                  color: "#999999",
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
