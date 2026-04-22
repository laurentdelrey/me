"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { TagFilter } from "@/lib/work/tags";
import { TAG_FILTERS } from "@/lib/work/tags";

type SiteHeaderProps = {
  visible?: boolean; // controls the right-side social block only
  topPaddingPx?: number;
  onClick?: () => void;
  color?: string;
  // When provided, the last word of the title becomes a filter menu.
  filter?: TagFilter;
  onFilterChange?: (f: TagFilter) => void;
};

export default function SiteHeader({
  visible = true,
  topPaddingPx = 16,
  onClick,
  color,
  filter,
  onFilterChange,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement | null>(null);

  const hasFilter = !!filter && !!onFilterChange;
  const effectiveFilter: TagFilter = filter ?? "story";
  const titleColor = color || "#ffffff";

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Hover-to-open with a grace period so cursor travel from the word into the
  // dropped menu doesn't close it.
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openOnHover = () => {
    if (!hasFilter) return;
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    setMenuOpen(true);
  };
  const closeOnHoverLeave = () => {
    if (!hasFilter) return;
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = setTimeout(() => setMenuOpen(false), 140);
  };

  return (
    <div
      className="fixed left-0 right-0 z-50 header-bar"
      style={{
        top: 0,
        pointerEvents: onClick || hasFilter ? "auto" : "none",
        paddingTop: topPaddingPx,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        columnGap: 16,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div className="header-spacer" />

      <div
        className="header-title-wrap"
        style={{ justifySelf: "center" }}
      >
        <span
          className="lowercase header-title"
          style={{
            fontSize: "1rem",
            lineHeight: "1.5",
            fontWeight: 400,
            color: titleColor,
            transition: "color 0.5s ease",
            display: "inline-flex",
            alignItems: "baseline",
          }}
        >
          {hasFilter ? (
            <>
              <span
                onClick={(e) => {
                  // Clicking the static prefix should behave like the
                  // non-filter title: optional scroll-to-start (if `onClick`
                  // was provided). The filter word has its own click handler.
                  onClick?.();
                  e.stopPropagation();
                }}
                style={{
                  pointerEvents: onClick ? "auto" : "none",
                  cursor: onClick ? "none" : "default",
                }}
                data-no-cursor-expand
              >
                laurent del rey&rsquo;s&nbsp;
              </span>

              {/* Anchor for the popup menu. The filter word owns the
                  hover/click interaction and the menu positions itself
                  flush against its left edge, so the dropped options align
                  with where the word starts (not centered under the title). */}
              <span
                ref={menuRef}
                style={{ position: "relative", display: "inline-block" }}
                onMouseEnter={openOnHover}
                onMouseLeave={closeOnHoverLeave}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMenuOpen((v) => !v);
                    }
                  }}
                  className="lowercase"
                  style={{
                    ...pillBase,
                    padding: "0 10px",
                    fontSize: "1rem",
                    fontWeight: 400,
                    lineHeight: 1.5,
                    display: "inline-flex",
                    alignItems: "center",
                    height: 28,
                  }}
                  data-no-cursor-expand
                >
                  {effectiveFilter}
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 6,
                        zIndex: 60,
                      }}
                      data-no-cursor-expand
                    >
                      {TAG_FILTERS.map((f) => {
                        const active = f === effectiveFilter;
                        return (
                          <motion.button
                            key={f}
                            type="button"
                            role="menuitemradio"
                            aria-checked={active}
                            onClick={() => {
                              onFilterChange?.(f);
                              setMenuOpen(false);
                            }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 20,
                            }}
                            className="lowercase"
                            style={{
                              ...pillBase,
                              padding: "0 10px",
                              fontSize: "1rem",
                              fontWeight: 400,
                              lineHeight: 1.5,
                              height: 28,
                              display: "inline-flex",
                              alignItems: "center",
                              // Mark the active filter with a subtle outline
                              // rather than a heavy-handed highlight, so the
                              // menu reads as a family of choices, not a form.
                              boxShadow: active
                                ? "inset 0 0 0 1px rgba(255,255,255,0.85)"
                                : undefined,
                              opacity: active ? 1 : 0.9,
                            }}
                            data-no-cursor-expand
                          >
                            {f}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={onClick}
              aria-label={onClick ? "Scroll to start" : undefined}
              tabIndex={onClick ? 0 : -1}
              className="lowercase"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: titleColor,
                fontSize: "1rem",
                fontWeight: 400,
                lineHeight: 1.5,
                cursor: onClick ? "none" : "default",
                pointerEvents: onClick ? "auto" : "none",
              }}
              data-no-cursor-expand
            >
              laurent del rey
            </button>
          )}
        </span>
      </div>

      <div
        className="lowercase header-social"
        style={{
          justifySelf: "end",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "1rem",
          color: titleColor,
          pointerEvents: "auto",
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
          :global(.header-bar) {
            grid-template-columns: auto 1fr !important;
          }
          :global(.header-spacer) {
            display: none !important;
          }
          :global(.header-title-wrap) {
            justify-self: start !important;
            grid-column: 1 !important;
          }
          :global(.header-social) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// Same chrome as the filmstrip chapter pills and the social links — this is
// the site's button language, so the filter menu feels like "part of the
// family" rather than a dropdown bolted on from somewhere else.
const pillBase: React.CSSProperties = {
  borderRadius: 4,
  background: "#b0b0b0",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  cursor: "none",
  whiteSpace: "nowrap",
  textDecoration: "none",
};

const socialPillStyle: React.CSSProperties = {
  ...pillBase,
  display: "inline-block",
  padding: "0 8px",
  lineHeight: 1.5,
};
