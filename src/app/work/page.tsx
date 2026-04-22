"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import { PlayheadCursor } from "@/components/PlayheadCursor";
import HeroMedia from "@/components/work/HeroMedia";
import { buildTimeline, getItemDate, getItemEraId, type TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";

// Canvas is heavy (renders 200+ tiles + lazy media). Keep it dynamic so the
// initial timeline page load doesn't pay for it. The tiles inside Canvas are
// only mounted while the grid is open (see `gridMounted` below).
const Canvas = dynamic(() => import("@/components/work/Canvas"), { ssr: false });

function chapterLabel(item: TimelineItem | undefined): string {
  if (!item) return "";
  if (item.kind === "tldr") return "tl;dr";
  if (item.kind === "social") return "@ me";
  if (item.kind === "eraIntro") return ERAS[item.eraId].label;
  return "";
}

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const Filmstrip = dynamic(() => import("@/components/work/Filmstrip"), { ssr: false });
const EraLabel = dynamic(() => import("@/components/work/EraLabel"), { ssr: false });
const PlayheadInfo = dynamic(() => import("@/components/work/PlayheadInfo"), { ssr: false });

export default function WorkPage() {
  const [mounted, setMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [headerStartY, setHeaderStartY] = useState(240);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  // Fetch the shared hidden list from /api/hidden (written by the dashboard).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hidden", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { ids: string[] };
        if (!cancelled && Array.isArray(data.ids)) {
          setHiddenIds(new Set(data.ids));
        }
      } catch {
        // silent — fall back to showing everything
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timeline = useMemo(() => buildTimeline(hiddenIds), [hiddenIds]);

  // Filmstrip drives currentIndex. Hover is the only override.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [playingStarted, setPlayingStarted] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 10>(1);
  const [view, setView] = useState<"timeline" | "grid">("timeline");
  const [seek, setSeek] = useState<{ index: number; nonce: number }>({
    index: 0,
    nonce: 0,
  });
  // Mobile breakpoint — drives responsive sizing for hero, controls, filmstrip.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Staggered landing reveal — chrome doesn't all shout at once.
  //   stage 0: nothing
  //   stage 1: header + hero
  //   stage 2: + filmstrip
  //   stage 3: + playback controls
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    const timers = [
      setTimeout(() => setStage(1), 150),
      setTimeout(() => setStage(2), 700),
      setTimeout(() => setStage(3), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [mounted]);

  // Auto-hide chrome on idle — mouse stops for ~2.5s, header + controls fade out.
  // Any movement (or touch on mobile) brings them right back.
  const [isIdle, setIsIdle] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const poke = () => {
      setIsIdle(false);
      if (t) clearTimeout(t);
      t = setTimeout(() => setIsIdle(true), 2500);
    };
    poke();
    window.addEventListener("mousemove", poke);
    window.addEventListener("touchstart", poke);
    window.addEventListener("keydown", poke);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("mousemove", poke);
      window.removeEventListener("touchstart", poke);
      window.removeEventListener("keydown", poke);
    };
  }, []);

  // Chrome visibility: must be revealed by stage AND active (not idle).
  const chromeActive = !isIdle;
  const headerVisibleFinal = stage >= 1 && chromeActive;
  const filmstripVisible = stage >= 2; // filmstrip stays visible once revealed
  const controlsVisible = stage >= 3 && chromeActive;
  const isPlaying = playingStarted && !userPaused;

  // Walk the timeline from `from` in `direction` (±1), skipping media items,
  // to find the next/prev "chapter" (tldr / eraIntro / social). Wraps around.
  const findChapterIndex = (from: number, direction: 1 | -1): number => {
    const n = timeline.length;
    if (n === 0) return 0;
    for (let step = 1; step <= n; step++) {
      const idx = (((from + direction * step) % n) + n) % n;
      if (timeline[idx].kind !== "media") return idx;
    }
    return from;
  };

  const prevChapterIndex = useMemo(
    () => findChapterIndex(currentIndex, -1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeline, currentIndex],
  );
  const nextChapterIndex = useMemo(
    () => findChapterIndex(currentIndex, 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeline, currentIndex],
  );
  // On the very first chapter (tldr), there's no meaningful "previous" —
  // hide the back pill rather than wrap around to `@ me`.
  const onFirstChapter = timeline[currentIndex]?.kind === "tldr";
  // Only show the prev-chapter button once the earliest (leftmost) thumb has
  // scrolled off-screen; otherwise it's redundant with the visible filmstrip.
  // THUMB_W matches Filmstrip's desktop/mobile sizes.
  const thumbW = isMobile ? 72 : 100;
  const leftmostVisible = currentIndex * thumbW <= (typeof window !== "undefined" ? window.innerWidth / 2 : 800);
  const prevLabel = onFirstChapter || leftmostVisible ? "" : chapterLabel(timeline[prevChapterIndex]);
  const nextLabel = chapterLabel(timeline[nextChapterIndex]);

  const seekTo = (idx: number) => {
    setSeek((s) => ({ index: idx, nonce: s.nonce + 1 }));
    setUserPaused(false);
  };
  const goToPrevChapter = () => seekTo(prevChapterIndex);
  const goToNextChapter = () => seekTo(nextChapterIndex);

  // Start the playhead as soon as the page mounts — don't wait for the map.
  // The map loads in the background while the tldr card plays; by the time
  // the user advances to meta, the map is ready (or nearly so).
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setPlayingStarted(true), 200);
    return () => clearTimeout(t);
  }, [mounted]);

  // Defer mounting the Map component by a few hundred ms so React doesn't
  // try to bring up mapbox-gl on the same frame as the tldr reveal. The
  // browser stays responsive for the first animation.
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setMapMounted(true), 600);
    return () => clearTimeout(t);
  }, [mounted]);

  const displayIndex = hoverIndex ?? currentIndex;
  const currentItem = timeline[displayIndex];
  const currentEraId = currentItem ? getItemEraId(currentItem) : null;
  const mapCenter = currentEraId ? ERAS[currentEraId].location : ERAS.tldr.location;
  const mapZoom = currentEraId ? ERAS[currentEraId].zoom : ERAS.tldr.zoom;

  // Mount Canvas only while the grid is open (plus a short tail so the
  // fade-out completes). This is the single biggest perf win — without it,
  // 200+ <img>/<video> elements live in the DOM the whole time.
  const [gridMounted, setGridMounted] = useState(false);
  useEffect(() => {
    if (view === "grid") {
      setGridMounted(true);
      return;
    }
    const t = setTimeout(() => setGridMounted(false), 350);
    return () => clearTimeout(t);
  }, [view]);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setHeaderVisible(true), 500);
    const computeStartY = () => {
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      setHeaderStartY(Math.max(0, Math.round(vh / 2 - 60)));
    };
    computeStartY();
    window.addEventListener("resize", computeStartY);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", computeStartY);
    };
  }, []);

  const [year, month, day] = currentItem
    ? getItemDate(currentItem)
    : [2026, 4, 10];

  return (
    <>
      {mounted && typeof window !== "undefined" && window.innerWidth > 768 && <PlayheadCursor />}

      {mapMounted && (
        <Map
          center={mapCenter as [number, number]}
          zoom={mapZoom}
          onLoad={() => setMapLoaded(true)}
        />
      )}

      <SiteHeader
        visible={chromeActive}
        topPaddingPx={28}
        color="#ffffff"
      />

      <main
        className={`h-screen relative z-10 overflow-hidden ${
          mounted ? "animate-fadeIn" : "opacity-0"
        }`}
      >
        {/* Vignette — diffuse page-grey fade, multi-stop so there's no
            visible edge to the "circle". */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 15%, rgba(191,191,191,0.15) 45%, rgba(191,191,191,0.5) 75%, rgba(191,191,191,1) 100%)",
            zIndex: 15,
          }}
        />

        {/* Era label removed — map location + timeline chapter convey the era now. */}

        {currentItem && view === "timeline" && (
          <HeroMedia
            item={currentItem}
            onVideoEnded={() => {}}
            isMobile={isMobile}
            speed={speed}
          />
        )}

        {/* Canvas is mounted only while the grid is on (or fading out).
            No tiles in the DOM at all in timeline mode. */}
        {gridMounted && (
          <Canvas
            timeline={timeline}
            currentIndex={currentIndex}
            onSelectItem={(idx) => {
              seekTo(idx);
              setView("timeline");
            }}
            visible={view === "grid"}
            isMobile={isMobile}
          />
        )}

        {mounted && (
          <PlayheadInfo
            year={year}
            month={month}
            day={day}
            isPlaying={isPlaying}
            onTogglePlaying={() => setUserPaused((p) => !p)}
            speed={speed}
            onToggleSpeed={() => setSpeed((s) => (s === 1 ? 10 : 1))}
            onBack={goToPrevChapter}
            onNext={goToNextChapter}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            isMobile={isMobile}
            visible={controlsVisible && view === "timeline"}
          />
        )}

        <Filmstrip
          timeline={timeline}
          hoverIndex={hoverIndex}
          onHoverItem={setHoverIndex}
          onLeave={() => setHoverIndex(null)}
          onCurrentIndexChange={setCurrentIndex}
          onSelectItem={seekTo}
          currentIndex={currentIndex}
          playing={isPlaying && view === "timeline"}
          speed={speed}
          seek={seek}
          isMobile={isMobile}
          visible={filmstripVisible && view === "timeline"}
        />

        {mounted && (
          <GridToggleIcon
            open={view === "grid"}
            onToggle={() => setView((v) => (v === "grid" ? "timeline" : "grid"))}
            isMobile={isMobile}
          />
        )}
      </main>
    </>
  );
}

/**
 * Single icon button top-left. Shows a 3x3 grid glyph when the grid is off,
 * and morphs into an X when on. Just a clean affordance — no labels.
 */
function GridToggleIcon({
  open,
  onToggle,
  isMobile,
}: {
  open: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  const size = isMobile ? 18 : 20;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "close grid view" : "open grid view"}
      aria-pressed={open}
      data-no-cursor-expand
      style={{
        position: "fixed",
        top: isMobile ? 22 : 28,
        left: isMobile ? 18 : 28,
        zIndex: 60,
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "none",
        color: "#ffffff",
        opacity: 0.92,
        transition: "opacity 160ms ease-out, transform 200ms ease-out",
        transform: open ? "rotate(45deg)" : "rotate(0deg)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.92")}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        style={{
          transition: "all 220ms ease-out",
        }}
      >
        {open ? (
          // X glyph (we also rotate the button 45deg, so this is a "+")
          <>
            <line
              x1="3"
              y1="10"
              x2="17"
              y2="10"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="3"
              x2="10"
              y2="17"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </>
        ) : (
          // 3x3 grid glyph
          <>
            {[2, 8, 14].map((y) =>
              [2, 8, 14].map((x) => (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={4}
                  height={4}
                  rx={0.6}
                  fill="currentColor"
                />
              )),
            )}
          </>
        )}
      </svg>
    </button>
  );
}
