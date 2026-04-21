"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGroup } from "motion/react";
import SiteHeader from "@/components/SiteHeader";
import { PlayheadCursor } from "@/components/PlayheadCursor";
import { buildTimeline, getItemDate, getItemEraId, type TimelineItem } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";

function chapterLabel(item: TimelineItem | undefined): string {
  if (!item) return "";
  if (item.kind === "tldr") return "tl;dr";
  if (item.kind === "social") return "@ me";
  if (item.kind === "eraIntro") return ERAS[item.eraId].label;
  return "";
}

// Dynamic imports (client-only)
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const HeroMedia = dynamic(() => import("@/components/work/HeroMedia"), { ssr: false });
const Filmstrip = dynamic(() => import("@/components/work/Filmstrip"), { ssr: false });
const EraLabel = dynamic(() => import("@/components/work/EraLabel"), { ssr: false });
const PlayheadInfo = dynamic(() => import("@/components/work/PlayheadInfo"), { ssr: false });
const Canvas = dynamic(() => import("@/components/work/Canvas"), { ssr: false });

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

  // Pre-warm the Canvas chunk on idle so the first timeline -> grid toggle
  // has no JS-load delay. Without this, the dynamic import resolves AFTER
  // HeroMedia has already unmounted, and Framer loses the bbox needed to
  // morph the hero into its tile.
  useEffect(() => {
    if (!mounted) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    if (w.requestIdleCallback) {
      idleId = w.requestIdleCallback(() => void import("@/components/work/Canvas"));
    } else {
      timer = setTimeout(() => void import("@/components/work/Canvas"), 800);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (idleId !== null && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
    };
  }, [mounted]);

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

        <LayoutGroup>
          {currentItem && view === "timeline" && (
            <HeroMedia
              item={currentItem}
              onVideoEnded={() => {}}
              isMobile={isMobile}
              speed={speed}
            />
          )}
          {mounted && view === "grid" && (
            <Canvas
              timeline={timeline}
              currentIndex={currentIndex}
              onSelectItem={(idx) => {
                setView("timeline");
                seekTo(idx);
              }}
              visible={true}
              isMobile={isMobile}
            />
          )}
        </LayoutGroup>

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
          <ViewToggle
            view={view}
            onChange={setView}
            isMobile={isMobile}
          />
        )}
      </main>
    </>
  );
}

function ViewToggle({
  view,
  onChange,
  isMobile,
}: {
  view: "timeline" | "grid";
  onChange: (v: "timeline" | "grid") => void;
  isMobile: boolean;
}) {
  const options: { id: "timeline" | "grid"; label: string }[] = [
    { id: "timeline", label: "timeline" },
    { id: "grid", label: "grid" },
  ];
  return (
    <div
      className="lowercase"
      style={{
        position: "fixed",
        top: isMobile ? 68 : 72,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 2,
        borderRadius: 6,
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.18)",
        fontSize: isMobile ? "0.85rem" : "0.9rem",
        color: "#ffffff",
        pointerEvents: "auto",
      }}
      data-no-cursor-expand
    >
      {options.map((opt) => {
        const active = view === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            data-no-cursor-expand
            style={{
              padding: isMobile ? "4px 10px" : "4px 12px",
              borderRadius: 4,
              background: active ? "#b0b0b0" : "transparent",
              color: "#ffffff",
              border: "none",
              cursor: "none",
              fontSize: "inherit",
              lineHeight: 1.4,
              transition: "background-color 200ms ease-out",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
