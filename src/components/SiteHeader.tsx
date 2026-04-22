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
  // When provided, the title becomes a dropdown that lets the user switch
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

  // Dropdown is available only when the parent wires `filter` + `onFilterChange`.
  // Keeps this header usable on pages that don't have a filtered timeline.
  const hasDropdown = !!filter && !!onFilterChange;
  const effectiveFilter: TagFilter = filter ?? "story";

  // Click outside / Escape closes the menu — standard dropdown UX.
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

  // Desktop: open on hover, close on leave after a short grace period so a
  // user moving the cursor from the title into the menu doesn't lose it.
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openOnHover = () => {
    if (!hasDropdown) return;
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    setMenuOpen(true);
  };
  const closeOnHoverLeave = () => {
    if (!hasDropdown) return;
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = setTimeout(() => setMenuOpen(false), 120);
  };

  const handleTitleClick = () => {
    if (hasDropdown) {
      setMenuOpen((v) => !v);
      return;
    }
    onClick?.();
  };

  const titleText = hasDropdown
    ? `laurent del rey's ${effectiveFilter}`
    : "laurent del rey";

  return (
    <div
      className="fixed left-0 right-0 z-50 header-bar"
      style={{
        top: 0,
        pointerEvents: onClick || hasDropdown ? "auto" : "none",
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

      <div
        ref={menuRef}
        className="header-title-wrap"
        style={{ position: "relative", justifySelf: "center" }}
        onMouseEnter={openOnHover}
        onMouseLeave={closeOnHoverLeave}
      >
        <button
          className={`lowercase header-title ${onClick || hasDropdown ? "cursor-pointer" : ""}`}
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
            pointerEvents: onClick || hasDropdown ? "auto" : "none",
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
          }}
          onClick={handleTitleClick}
          aria-label={
            hasDropdown
              ? "Change filter"
              : onClick
                ? "Scroll to start"
                : undefined
          }
          aria-haspopup={hasDropdown ? "menu" : undefined}
          aria-expanded={hasDropdown ? menuOpen : undefined}
          tabIndex={onClick || hasDropdown ? 0 : -1}
          onKeyDown={(e) => {
            if (hasDropdown && (e.key === "Enter" || e.key === " ")) {
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
          {hasDropdown ? (
            <>
              <span>laurent del rey&rsquo;s </span>
              <span
                style={{
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  textDecorationThickness: 1,
                }}
              >
                {effectiveFilter}
              </span>
              <span
                aria-hidden
                style={{
                  fontSize: "0.75em",
                  transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease-out",
                  display: "inline-block",
                  marginLeft: 2,
                }}
              >
                ▾
              </span>
            </>
          ) : (
            "laurent del rey"
          )}
        </button>

        {hasDropdown && (
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
                  top: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(255,255,255,0.98)",
                  color: "#111",
                  borderRadius: 12,
                  boxShadow:
                    "0 14px 40px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)",
                  padding: 6,
                  minWidth: 180,
                  display: "flex",
                  flexDirection: "column",
                  zIndex: 60,
                }}
                // Visible cursor over the menu even though the page uses a
                // custom playhead cursor everywhere else.
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
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: active ? "rgba(0,0,0,0.06)" : "transparent",
                        color: "#111",
                        border: "none",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        lineHeight: 1.4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        textTransform: "lowercase",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = active
                          ? "rgba(0,0,0,0.06)"
                          : "transparent";
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: active ? "#111" : "transparent",
                          border: active ? "none" : "1px solid rgba(0,0,0,0.2)",
                          display: "inline-block",
                        }}
                      />
                      {f}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

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
          :global(.header-title-wrap) {
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
