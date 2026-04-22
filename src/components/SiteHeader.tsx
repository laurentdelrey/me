"use client";

import { motion } from "motion/react";
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
  // `clickOpen` is the keyboard/tap-to-open latch. Hover-to-open is handled
  // entirely in CSS via `:hover` on the host — no JS event listeners, no
  // timer races, no AnimatePresence mount/unmount cost. The CSS approach is
  // bulletproof because `:hover` applies to an element AND all its descendants
  // at once, so moving the mouse from the word into the dropped menu never
  // breaks the hover state. We only keep JS state for the click path (and to
  // drive an outside-click / Escape close).
  const [clickOpen, setClickOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement | null>(null);

  const hasFilter = !!filter && !!onFilterChange;
  const effectiveFilter: TagFilter = filter ?? "story";
  const titleColor = color || "#ffffff";

  useEffect(() => {
    if (!clickOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setClickOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClickOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [clickOpen]);

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

              {/* Anchor for the popup menu. Hover-to-open is pure CSS:
                  `.filter-host:hover .filter-menu` shows the menu, and
                  because the menu is a DOM descendant of the host, moving
                  the mouse onto it KEEPS the host in :hover state. There's
                  no timer, no JS state to race. Click-open is layered on
                  top via `data-open` for mobile/keyboard users. */}
              <span
                ref={menuRef}
                className="filter-host"
                data-open={clickOpen ? "true" : "false"}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={clickOpen}
                  onClick={() => setClickOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setClickOpen((v) => !v);
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

                <div
                  role="menu"
                  className="filter-menu"
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
                          setClickOpen(false);
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
                </div>
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
        /* Hover-open filter menu. Pure CSS :hover is the ONLY thing that
           toggles visibility on desktop, so there's no JS event quirk that
           can silently break it. The menu is a descendant of .filter-host,
           so moving the mouse from the word onto the menu keeps .filter-host
           in :hover state and the menu stays open. A matching :hover rule
           on the menu itself covers the (already-impossible) edge case of
           the menu being hovered without its host being considered hovered. */
        :global(.filter-host) {
          position: relative;
          display: inline-block;
        }
        :global(.filter-menu) {
          position: absolute;
          top: 100%;
          left: 0;
          padding-top: 6px; /* visible gap, inside the menu's hit-box */
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          z-index: 60;
          opacity: 0;
          pointer-events: none;
          transform: translateY(-4px);
          transition: opacity 180ms ease-out, transform 180ms ease-out;
        }
        :global(.filter-host:hover .filter-menu),
        :global(.filter-host[data-open="true"] .filter-menu),
        :global(.filter-menu:hover) {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }

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
