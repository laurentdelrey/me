"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  // After selecting a filter we want the menu to dismiss even though the
  // mouse is still hovering the host (otherwise pure-CSS :hover keeps it
  // pinned open, which is confusing post-click). `dismissed` overrides
  // :hover until the user moves away — then the host is ready to open
  // again on the next hover. `picked` holds the chosen filter for the
  // duration of the exit so the selected pill can run a confirmation
  // pulse while the others slide off quietly.
  const [dismissed, setDismissed] = useState(false);
  const [picked, setPicked] = useState<TagFilter | null>(null);
  // When a filter is picked we measure the delta from the clicked pill's
  // center to the header filter button's center, apply that delta to the
  // picked pill via a CSS translate, and let it slide up so it visually
  // *lands on* the button — replacing the old label. Since both have the
  // same pillBase styling they're visually interchangeable; after the
  // flight we fade the flying pill out and the button beneath (now with
  // the updated label) is revealed seamlessly.
  const [flyDelta, setFlyDelta] = useState<{ dx: number; dy: number } | null>(null);
  const menuRef = useRef<HTMLSpanElement | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const pillRefs = useRef<Map<TagFilter, HTMLButtonElement>>(new Map());
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setPillRef = useCallback(
    (f: TagFilter) => (el: HTMLButtonElement | null) => {
      if (el) pillRefs.current.set(f, el);
      else pillRefs.current.delete(f);
    },
    [],
  );

  const handlePick = useCallback(
    (f: TagFilter) => {
      const pillEl = pillRefs.current.get(f);
      const btnEl = filterBtnRef.current;
      if (pillEl && btnEl) {
        const p = pillEl.getBoundingClientRect();
        const b = btnEl.getBoundingClientRect();
        setFlyDelta({
          dx: b.left + b.width / 2 - (p.left + p.width / 2),
          dy: b.top + b.height / 2 - (p.top + p.height / 2),
        });
      } else {
        setFlyDelta(null);
      }
      setPicked(f);
      setDismissed(true);
      setClickOpen(false);
      // Delay the commit so the header button's label pop happens while
      // the flying pill is mid-air (and covering the header button
      // visually), not at t=0. Lands well before the pill fades out so
      // the pill touches down on a correctly-sized target.
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      commitTimerRef.current = setTimeout(() => {
        onFilterChange?.(f);
        commitTimerRef.current = null;
      }, 200);
    },
    [onFilterChange],
  );

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

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
                data-dismissed={dismissed ? "true" : "false"}
                onMouseLeave={() => {
                  setDismissed(false);
                  setPicked(null);
                  setFlyDelta(null);
                }}
              >
                <button
                  ref={filterBtnRef}
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
                      // Plain <button> (not motion.button) so CSS owns the
                      // transform — the staggered entrance, hover-pop, and
                      // tap-squish all compose cleanly on the same property.
                      // A motion.button's inline `transform` style would
                      // override the class rules and kill the cascade.
                      <button
                        key={f}
                        ref={setPillRef(f)}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => handlePick(f)}
                        className="lowercase filter-menu-item"
                        data-picked={picked === f ? "true" : "false"}
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
                          // Picked pill gets the fly delta as CSS custom
                          // properties; the [data-picked="true"] CSS rule
                          // reads them to translate the pill toward the
                          // header button.
                          ...(picked === f && flyDelta
                            ? ({
                                ["--fly-x" as string]: `${flyDelta.dx}px`,
                                ["--fly-y" as string]: `${flyDelta.dy}px`,
                              } as React.CSSProperties)
                            : {}),
                        }}
                        data-no-cursor-expand
                      >
                        {f}
                      </button>
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
           the menu being hovered without its host being considered hovered.

           Motion:
             - Container lands with a soft "settle" (slight scale + translateY)
               using an ease-out curve with a subtle overshoot feel.
             - Items cascade in from the top via per-nth-child transition-delay,
               each with its own pop (scale 0.94 → 1 + slide + fade).
             - Closing uses the same transitions but WITHOUT the stagger delays
               so everything collapses together — crisp, not a reverse cascade. */
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
          transform: translateY(-6px) scale(0.985);
          transform-origin: top left;
          transition:
            opacity 220ms cubic-bezier(0.4, 0, 0.2, 1),
            transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        :global(.filter-host:hover .filter-menu),
        :global(.filter-host[data-open="true"] .filter-menu),
        :global(.filter-menu:hover) {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0) scale(1);
        }

        /* Per-item entrance — each button pops in from above with a slight
           scale. Delays are applied only in the open state so closing is
           uniform and fast. Transform origin is center so hover scales
           symmetrically (left-origin made the pill grow rightward and
           read as jumpy). */
        :global(.filter-menu button) {
          opacity: 0;
          transform: translate(0, -8px) scale(0.94);
          transform-origin: center center;
          transition:
            opacity 260ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 340ms cubic-bezier(0.34, 1.3, 0.64, 1),
            box-shadow 180ms ease-out;
          transition-delay: 0ms;
        }
        :global(.filter-host:hover .filter-menu button),
        :global(.filter-host[data-open="true"] .filter-menu button),
        :global(.filter-menu:hover button) {
          opacity: 1;
          transform: translate(0, 0) scale(1);
        }
        :global(.filter-host:hover .filter-menu button:nth-child(1)),
        :global(.filter-host[data-open="true"] .filter-menu button:nth-child(1)),
        :global(.filter-menu:hover button:nth-child(1)) {
          transition-delay: 40ms;
        }
        :global(.filter-host:hover .filter-menu button:nth-child(2)),
        :global(.filter-host[data-open="true"] .filter-menu button:nth-child(2)),
        :global(.filter-menu:hover button:nth-child(2)) {
          transition-delay: 90ms;
        }
        :global(.filter-host:hover .filter-menu button:nth-child(3)),
        :global(.filter-host[data-open="true"] .filter-menu button:nth-child(3)),
        :global(.filter-menu:hover button:nth-child(3)) {
          transition-delay: 140ms;
        }
        :global(.filter-host:hover .filter-menu button:nth-child(4)),
        :global(.filter-host[data-open="true"] .filter-menu button:nth-child(4)),
        :global(.filter-menu:hover button:nth-child(4)) {
          transition-delay: 185ms;
        }

        /* Menu-item micro-interactions. Only apply while the menu is open,
           so they can't compete with the closed-state transform. Smooth
           ease-out on hover (a 4% scale with an overshoot curve reads as
           jitter, not spring — small deltas want gentle curves); quick
           squish on active. */
        :global(.filter-host:hover .filter-menu button:hover),
        :global(.filter-host[data-open="true"] .filter-menu button:hover),
        :global(.filter-menu:hover button:hover) {
          transform: translate(0, 0) scale(1.03);
          transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 180ms ease-out;
          transition-delay: 0ms;
        }
        :global(.filter-host:hover .filter-menu button:active),
        :global(.filter-host[data-open="true"] .filter-menu button:active),
        :global(.filter-menu:hover button:active) {
          transform: translate(0, 0) scale(0.96);
          transition: transform 120ms ease-out;
          transition-delay: 0ms;
        }

        /* Post-selection dismiss — the "pill flies up to become the label"
           choreography.

           When a filter is picked:
             1. JS measures the clicked pill's rect and the header button's
                rect, then sets --fly-x / --fly-y CSS variables on the pill
                to the delta between their centers.
             2. The picked pill translates along that delta — landing
                exactly on top of the header button. Both share the same
                pillBase styling, so visually the pill *replaces* the label.
             3. onFilterChange fires immediately; the header button
                re-renders with the new label underneath the still-opaque
                flying pill.
             4. Near arrival, the flying pill fades out, revealing the
                updated header button — no flicker, no swap frame.
             5. Non-picked pills fade and shrink quietly so all attention
                is on the picked pill's flight. */
        :global(.filter-host[data-dismissed="true"] .filter-menu) {
          opacity: 1;
          pointer-events: none;
          transform: translate(0, 0) scale(1);
        }
        /* [data-picked] attribute selector matches specificity of the
           per-nth-child open-state rules so this wins cleanly by ordering
           rather than leaking :nth-child delays into the dismiss path. */
        :global(.filter-host[data-dismissed="true"] .filter-menu button[data-picked="false"]) {
          opacity: 0;
          transform: translate(0, 0) scale(0.9);
          transition:
            opacity 180ms cubic-bezier(0.4, 0, 1, 1),
            transform 220ms cubic-bezier(0.4, 0, 1, 1);
          transition-delay: 0ms;
        }
        /* Picked pill: travels to the header button's position. Opacity
           fade delayed so the pill stays fully opaque during the flight,
           covering the button's in-flight label swap, then fades once it
           has arrived and the new label is already rendered underneath. */
        :global(.filter-host[data-dismissed="true"] .filter-menu button[data-picked="true"]) {
          opacity: 0;
          transform: translate(var(--fly-x, 0), var(--fly-y, 0)) scale(1);
          z-index: 2;
          transition:
            transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 160ms ease-out 320ms;
          transition-delay: 0ms;
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
