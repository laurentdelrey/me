"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import { IPadCursor } from "@/components/IPadCursor";
import { SlidingNumber } from "@/../components/motion-primitives/sliding-number";
import { buildTimeline, getItemDate, getItemEraId } from "@/lib/work/timeline";
import { ERAS } from "@/lib/work/eras";
import { useAutoplay } from "@/hooks/useAutoplay";

// Dynamic imports (client-only / avoid SSR issues)
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
  const autoplay = useAutoplay({ timeline });

  const currentItem = timeline[autoplay.currentIndex];
  const currentEraId = currentItem ? getItemEraId(currentItem) : null;
  // For tldr/social (no era), use Topanga (home); otherwise use era location
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

  // Scroll/wheel → advance playhead (throttled)
  useEffect(() => {
    let accum = 0;
    const THRESHOLD = 80;
    let cooldown = false;
    const onWheel = (e: WheelEvent) => {
      if (cooldown) return;
      accum += e.deltaY;
      if (Math.abs(accum) >= THRESHOLD) {
        const direction = accum > 0 ? 1 : -1;
        const next = Math.max(
          0,
          Math.min(timeline.length - 1, autoplay.baseIndex + direction)
        );
        autoplay.jumpTo(next);
        accum = 0;
        cooldown = true;
        setTimeout(() => {
          cooldown = false;
        }, 200);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [autoplay, timeline.length]);

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

      {/* Rolling date — top left */}
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
        {/* Subtle bottom gradient for filmstrip readability */}
        <div
          className="fixed bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 220,
            background:
              "linear-gradient(to top, rgba(191,191,191,1) 0%, rgba(191,191,191,0.6) 30%, rgba(191,191,191,0.15) 65%, transparent 100%)",
            zIndex: 20,
          }}
        />

        {/* Subtle top gradient for header readability */}
        <div
          className="fixed top-0 left-0 right-0 pointer-events-none"
          style={{
            height: 180,
            background:
              "linear-gradient(to bottom, rgba(191,191,191,1) 0%, rgba(191,191,191,0.6) 30%, rgba(191,191,191,0.15) 65%, transparent 100%)",
            zIndex: 15,
          }}
        />

        {/* Era label (bottom-left, above filmstrip) */}
        <EraLabel eraId={currentEraId} />

        {/* Hero */}
        {currentItem && (
          <HeroMedia item={currentItem} onVideoEnded={autoplay.onVideoEnded} />
        )}

        {/* Filmstrip */}
        <Filmstrip
          timeline={timeline}
          currentIndex={autoplay.currentIndex}
          hoverIndex={autoplay.hoverIndex}
          onHoverItem={autoplay.setHoverIndex}
          onLeave={() => autoplay.setHoverIndex(null)}
        />
      </main>
    </>
  );
}
