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
  // When provided, the title becomes a filter menu that lets the user switch
  // between "story" (default, everything) and the individual tag filters.
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
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Filter menu shows only when the parent wires both `filter` + `onFilterChange`,
  // so plain pages without a filtered timeline keep the minimal title.
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

  // Hover-to-open with a brief close grace so the cursor can travel from the
  // title into the menu without it collapsing.
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

  const handleTitleClick = () => {
    if (hasFilter) {
      setMenuOpen((v) => !v);
      return;
    }
    onClick?.();
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
        ref={menuRef}
        className="header-title-wrap"
        style={{ position: "relative", justifySelf: "center" }}
        onMouseEnter={openOnHover}
        onMouseLeave={closeOnHoverLeave}
      >
        <button
          className={`lowercase header-title ${onClick || hasFilter ? "cursor-pointer" : ""}`}
          style={{
            fontSize: "1rem",
            lineHeight: "1.5",
            fontWeight: 400,
            color: titleColor,
            transition: "color 0.5s ease",
            margin: 0,
            background: "transparent",
            border: "none",
            padding: 0,
            pointerEvents: onClick || hasFilter ? "auto" : "none",
          }}
          onClick={handleTitleClick}
          aria-label={
            hasFilter ? "Change filter" : onClick ? "Scroll to start" : undefined
          }
          aria-haspopup={hasFilter ? "menu" : undefined}
          aria-expanded={hasFilter ? menuOpen : undefined}
          tabIndex={onClick || hasFilter ? 0 : -1}
          onKeyDown={(e) => {
            if (hasFilter && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setMenuOpen((v) => !v);
              return;
            }
            if (onClick && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onClick();
            }
          }}
        >
          {hasFilter ? (
            <>
              laurent del rey&rsquo;s{" "}
              {/* Current filter word is dotted-underlined to hint that it's
                  swappable without introducing a foreign dropdown chrome. */}
              <span
                style={{
                  textDecoration: "underline dotted",
                  textUnderlineOffset: 4,
                  textDecorationThickness: 1,
                  textDecorationColor: "rgba(255,255,255,0.6)",
                }}
              >
                {effectiveFilter}
              </span>
            </>
          ) : (
            "laurent del rey"
          )}
        </button>

        {/* Filter menu — stacked text options below the title, styled to
            disappear into the page: no card, no border, no shadow. Just the
            same typography as the header, with inactive options at reduced
            opacity and the active one marked with a leading dot. */}
        {hasFilter && (
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
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  zIndex: 60,
                  paddingTop: 4,
                  paddingBottom: 4,
                }}
                data-no-cursor-expand
              >
                {TAG_FILTERS.map((f) => {
                  const active = f === effectiveFilter;
                  return (
                    <button
                      key={f}
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        onFilterChange?.(f);
                        setMenuOpen(false);
                      }}
                      className="lowercase filter-item"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "2px 8px",
                        color: titleColor,
                        fontSize: "1rem",
                        lineHeight: 1.5,
                        fontWeight: 400,
                        opacity: active ? 1 : 0.55,
                        cursor: "pointer",
                        transition: "opacity 140ms ease-out",
                        textDecoration: active ? "underline" : "none",
                        textUnderlineOffset: 4,
                        textDecorationThickness: 1,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
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
        .filter-item:hover {
          opacity: 1 !important;
        }
        @media (max-width: 640px) {
          /* Mobile layout: anchor the title left. The title is long enough on
             its own (especially when it's "laurent del rey's prototypes") so
             we hide the social block to keep one line. The links still live on
             desktop / tablet; on phones they're one tap away via the filmstrip
             cards or the /work content, and clutter matters more. */
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
