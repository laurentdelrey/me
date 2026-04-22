"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
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

// One spring, used everywhere the dropdown needs to move. Tuned to feel
// physical but not bouncy — interruptible so that rapid hover/click
// sequences carry velocity through instead of snapping back to start.
// Stiffness 520 + damping 42 + mass 0.8 lands decisively without
// overshoot at our pill scale.
const SPRING = { type: "spring" as const, stiffness: 520, damping: 42, mass: 0.8 };

export default function SiteHeader({
  visible = true,
  topPaddingPx = 16,
  onClick,
  color,
  filter,
  onFilterChange,
}: SiteHeaderProps) {
  // Single source of truth for open/closed. No CSS :hover path — every
  // open/close routes through this state so the motion system can
  // coordinate without racing against CSS transitions.
  const [open, setOpen] = useState(false);
  // Briefly flipped true the moment a pick is committed. While it's
  // true, non-active pills fade to opacity 0 in parallel with the
  // shared-layout reorder — so the menu "clears out" quickly without
  // waiting for the hold-then-close path to run its exit animations.
  const [committing, setCommitting] = useState(false);
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilter = !!filter && !!onFilterChange;
  const effectiveFilter: TagFilter = filter ?? "story";
  const titleColor = color || "#ffffff";

  // The menu is rendered [active, ...others] so the active pill always
  // occupies slot 0 — exactly where the trigger sat. When the menu
  // opens, the cursor stays hovering the active pill (no visual jump),
  // and when any menu item is clicked, it morphs UP through the list
  // to slot 0 to become the new trigger. The "others" keep their
  // TAG_FILTERS-relative order so the layout only changes in response
  // to a selection, not arbitrarily.
  const orderedFilters = useMemo<TagFilter[]>(() => {
    const others = TAG_FILTERS.filter((f) => f !== effectiveFilter);
    return [effectiveFilter, ...others];
  }, [effectiveFilter]);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Small grace period on mouseleave so the pointer can travel between
  // adjacent menu items (or from item to trigger) without the menu
  // collapsing out from under it.
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    return () => cancelClose();
  }, []);

  // Outside click / Escape close
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handlePick = (f: TagFilter) => {
    // When the user clicks the currently-active pill while the menu is
    // closed, treat it as "open the menu" rather than re-selecting.
    if (!open && f === effectiveFilter) {
      setOpen(true);
      return;
    }
    cancelClose();
    // Kick the non-active pills toward opacity 0 immediately so the
    // menu visibly clears while the clicked pill is still morphing to
    // slot 0. The shared-layout motion runs in parallel — by the time
    // the fades finish (~180ms) the clicked pill has reached the
    // trigger slot and the unmount at t=340ms is invisible.
    setCommitting(true);
    onFilterChange?.(f);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setCommitting(false);
      closeTimerRef.current = null;
    }, 340);
  };

  // Only the items currently mounted. When closed that's just the
  // active pill (which visually IS the trigger); when open it's the
  // full ordered list.
  const rendered: TagFilter[] = open ? orderedFilters : [effectiveFilter];

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

      <div className="header-title-wrap" style={{ justifySelf: "center" }}>
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

              <span
                ref={hostRef}
                className="filter-host"
                onMouseEnter={() => {
                  cancelClose();
                  setOpen(true);
                }}
                onMouseLeave={scheduleClose}
              >
                {/* Invisible in-flow placeholder: same shape as the
                    active pill so the title baseline doesn't shift
                    when the menu mounts. The interactive pills live
                    in the absolutely-positioned overlay on top. */}
                <span className="filter-placeholder" aria-hidden>
                  {effectiveFilter}
                </span>

                <div
                  className="filter-overlay"
                  role="menu"
                  aria-label="filter"
                  data-no-cursor-expand
                >
                  <LayoutGroup id="site-header-filter">
                    {/* `popLayout` is the key to the select-to-trigger
                        feeling instant: exiting pills are lifted out of
                        the flex flow the moment they start animating
                        out, so the remaining pill reflows to slot 0 on
                        the same frame as the click. Without it (sync
                        mode), exiting pills hold their flex slots until
                        their exit animation finishes — which is the
                        ~300ms pause where the layout visibly "resizes"
                        before the morph begins. */}
                    <AnimatePresence initial={false} mode="popLayout">
                      {rendered.map((f) => {
                        const isActive = f === effectiveFilter;
                        return (
                          <motion.button
                            key={f}
                            // Per-filter layoutId pairs each pill's
                            // previous bounding box with its next one
                            // across any mount/unmount. The clicked
                            // item springs to slot 0 (trigger spot)
                            // because framer remembers where it was.
                            layoutId={`pill-${f}`}
                            type="button"
                            role={isActive && !open ? undefined : "menuitemradio"}
                            aria-haspopup={isActive && !open ? "menu" : undefined}
                            aria-expanded={isActive && !open ? open : undefined}
                            aria-checked={open ? isActive : undefined}
                            onClick={() => handlePick(f)}
                            className="lowercase filter-pill"
                            // Active pill is layoutId-driven only — no
                            // initial/exit so framer owns its motion
                            // fully. Non-active pills bloom in with a
                            // short drop + fade; their exit reverses it.
                            // While `committing` is true, non-active
                            // pills animate opacity to 0 so they clear
                            // immediately, independently of the hold-
                            // then-close timing that keeps the morph
                            // running for everyone.
                            initial={
                              isActive
                                ? false
                                : { opacity: 0, y: -6, scale: 0.94 }
                            }
                            animate={{
                              opacity: committing && !isActive ? 0 : 1,
                              y: 0,
                              scale: 1,
                            }}
                            exit={
                              isActive
                                ? undefined
                                : { opacity: 0, y: -6, scale: 0.94 }
                            }
                            transition={{
                              default: SPRING,
                              // Opacity rides on a crisp ease-out so
                              // the fade has a clean "snap out" feel,
                              // rather than the spring's softer tail.
                              opacity: { duration: 0.18, ease: [0.4, 0, 1, 1] },
                            }}
                            data-no-cursor-expand
                          >
                            {f}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </LayoutGroup>
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
        /* Everything dropdown-related is pure shape + chrome here.
           All motion is owned by framer-motion's layout system —
           opening, closing, and the select-to-trigger morph are a
           single continuous spring on each pill's bounding box. */
        :global(.filter-host) {
          position: relative;
          display: inline-block;
        }
        /* Shape-only placeholder matching the pill geometry so the
           title's baseline stays put regardless of how many pills
           are currently drawn in the overlay. */
        :global(.filter-placeholder) {
          padding: 0 10px;
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.5;
          display: inline-flex;
          align-items: center;
          height: 28px;
          visibility: hidden;
          pointer-events: none;
        }
        :global(.filter-overlay) {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 60;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        :global(.filter-pill) {
          border-radius: 4px;
          background: #b0b0b0;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 0 10px;
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.5;
          height: 28px;
          display: inline-flex;
          align-items: center;
          cursor: none;
          white-space: nowrap;
          /* Only chrome transitions here — positional motion is
             framer's job. Keeping this narrow prevents CSS from
             competing with the layout spring. */
          transition:
            background 140ms ease-out,
            box-shadow 160ms ease-out;
        }
        :global(.filter-pill:hover) {
          background: #bdbdbd;
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

// Same chrome as the filmstrip chapter pills and the social links — this
// is the site's button language, so the filter menu feels like "part of
// the family" rather than a dropdown bolted on from somewhere else.
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
