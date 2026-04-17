"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import { IPadCursor } from "@/components/IPadCursor";
import { SlidingNumber } from "@/../components/motion-primitives/sliding-number";
import { buildTimeline, getItemDate, getItemEraId } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";

// Dynamic imports (client-only)
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const HeroMedia = dynamic(() => import("@/components/work/HeroMedia"), { ssr: false });
const Filmstrip = dynamic(() => import("@/components/work/Filmstrip"), { ssr: false });
const EraLabel = dynamic(() => import("@/components/work/EraLabel"), { ssr: false });

export default function WorkPage() {
  const [mounted, setMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [headerStartY, setHeaderStartY] = useState(240);
  const [hiddenIds] = useState<Set<string>>(() => new Set());

  const timeline = useMemo(() => buildTimeline(hiddenIds), [hiddenIds]);

  // Filmstrip drives currentIndex. Hover is the only override.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [playingStarted, setPlayingStarted] = useState(false);

  // Start the playhead as soon as the map loads (the fade-in runs concurrently)
  useEffect(() => {
    if (mapLoaded) setPlayingStarted(true);
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

      {mapLoaded && (
        <div
          className="fixed"
          data-no-cursor-expand
          style={{ top: 32, left: 32, zIndex: 40, cursor: "none", pointerEvents: "none" }}
        >
          <div
            className="text-white"
            style={{
              fontSize: "0.8rem",
              fontWeight: 400,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <SlidingNumber value={year} />
            <span className="text-white/30">.</span>
            <SlidingNumber value={month} padStart />
            <span className="text-white/30">.</span>
            <SlidingNumber value={day} padStart />
          </div>
        </div>
      )}

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

        <Filmstrip
          timeline={timeline}
          hoverIndex={hoverIndex}
          onHoverItem={setHoverIndex}
          onLeave={() => setHoverIndex(null)}
          onCurrentIndexChange={setCurrentIndex}
          playing={playingStarted}
        />
      </main>
    </>
  );
}
