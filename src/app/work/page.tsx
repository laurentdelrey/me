"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import { IPadCursor } from "@/components/IPadCursor";
import { buildTimeline, getItemDate, getItemEraId } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";

// Dynamic imports (client-only)
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const HeroMedia = dynamic(() => import("@/components/work/HeroMedia"), { ssr: false });
const Filmstrip = dynamic(() => import("@/components/work/Filmstrip"), { ssr: false });
const EraLabel = dynamic(() => import("@/components/work/EraLabel"), { ssr: false });
const PlayheadInfo = dynamic(() => import("@/components/work/PlayheadInfo"), { ssr: false });

export default function WorkPage() {
  const [mounted, setMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
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
  const [speed, setSpeed] = useState<1 | 2 | 10>(1);
  const [seek, setSeek] = useState<{ index: number; nonce: number }>({
    index: 0,
    nonce: 0,
  });
  const isPlaying = playingStarted && !userPaused;

  const goToStart = () => {
    setSeek((s) => ({ index: 0, nonce: s.nonce + 1 }));
    setUserPaused(false);
  };

  const goToNextChapter = () => {
    // "Chapter" = next non-media item (tldr / eraIntro / social).
    // Walk forward from currentIndex, wrapping around.
    const n = timeline.length;
    if (n === 0) return;
    for (let step = 1; step <= n; step++) {
      const idx = (currentIndex + step) % n;
      if (timeline[idx].kind !== "media") {
        setSeek((s) => ({ index: idx, nonce: s.nonce + 1 }));
        setUserPaused(false);
        return;
      }
    }
  };

  // Wait for the map to finish loading before starting the playhead.
  // This keeps the intro coordinated — everything reveals together.
  useEffect(() => {
    if (!mapLoaded) return;
    const t = setTimeout(() => setPlayingStarted(true), 200);
    return () => clearTimeout(t);
  }, [mapLoaded]);

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
      {mounted && typeof window !== "undefined" && window.innerWidth > 768 && <IPadCursor />}

      <Map
        center={mapCenter as [number, number]}
        zoom={mapZoom}
        onLoad={() => setMapLoaded(true)}
      />

      <SiteHeader
        animated
        toTop={mapLoaded}
        visible={headerVisible && mounted}
        startY={headerStartY}
        topPaddingPx={28}
        color="#ffffff"
      />

      <main
        className={`h-screen relative z-10 overflow-hidden ${
          mounted && mapLoaded ? "animate-fadeIn" : "opacity-0"
        }`}
      >
        <div
          className="fixed bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 220,
            background:
              "linear-gradient(to top, rgba(191,191,191,1) 0%, rgba(191,191,191,0.6) 30%, rgba(191,191,191,0.15) 65%, transparent 100%)",
            zIndex: 20,
          }}
        />
        <div
          className="fixed top-0 left-0 right-0 pointer-events-none"
          style={{
            height: 180,
            background:
              "linear-gradient(to bottom, rgba(191,191,191,1) 0%, rgba(191,191,191,0.6) 30%, rgba(191,191,191,0.15) 65%, transparent 100%)",
            zIndex: 15,
          }}
        />

        <EraLabel eraId={currentEraId} />

        {currentItem && (
          <HeroMedia
            item={currentItem}
            onVideoEnded={() => {}}
          />
        )}

        {mapLoaded && (
          <PlayheadInfo
            year={year}
            month={month}
            day={day}
            isPlaying={isPlaying}
            onTogglePlaying={() => setUserPaused((p) => !p)}
            speed={speed}
            onToggleSpeed={() =>
              setSpeed((s) => (s === 1 ? 2 : s === 2 ? 10 : 1))
            }
            onBack={goToStart}
            onNext={goToNextChapter}
          />
        )}

        <Filmstrip
          timeline={timeline}
          hoverIndex={hoverIndex}
          onHoverItem={setHoverIndex}
          onLeave={() => setHoverIndex(null)}
          onCurrentIndexChange={setCurrentIndex}
          playing={isPlaying}
          speed={speed}
          seek={seek}
        />
      </main>
    </>
  );
}
