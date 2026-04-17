"use client";

import { useEffect, useRef, useState } from "react";

interface MapProps {
  center: [number, number];
  zoom: number;
  onLoad?: () => void;
}

export default function Map({ center, zoom, onLoad }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapError, setMapError] = useState<string>("");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map only once
  useEffect(() => {
    // Add mapbox CSS to document head
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Dynamically import mapbox-gl to avoid SSR issues
    import("mapbox-gl").then((mapboxgl) => {
      if (!mapContainer.current) return;

      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

      console.log("Container dimensions:", mapContainer.current.offsetWidth, mapContainer.current.offsetHeight);

      const map = new mapboxgl.default.Map({
        container: mapContainer.current,
        // Custom monochrome style with the grey palette baked in — no runtime
        // setPaintProperty loop needed, no "brown flash into grey" transition.
        style: `mapbox://styles/laurentdelrey/cmnw9fue6005v01sv8gb600zg`,
        center: center,
        zoom: zoom,
        pitch: 50, // Initial tilt for 3D effect
        bearing: 0, // Initial rotation
        interactive: false,
        attributionControl: false,
      });

      mapRef.current = map;
      
      // Log when map loads successfully
      map.on('load', () => {
        console.log('Mapbox loaded successfully');

        // The Studio style is templated (`mapbox:variation`) which locks fog
        // colors to a dark-brown palette we can't override via the Styles API.
        // Override at runtime instead — it's a single setFog call, cheap.
        try {
          map.setFog({
            range: [0.5, 10],
            color: '#b0b0b0',
            'high-color': '#b0b0b0',
            'space-color': '#b0b0b0',
            'horizon-blend': 0.1,
            'star-intensity': 0,
          });
        } catch {}

        // Colors are baked into the custom Studio style now — no runtime
        // setPaintProperty loop, no "brown flash into grey" transition.
        requestAnimationFrame(() => {
          if (onLoad) onLoad();
        });

        setMapLoaded(true);

        // Force a resize in case container dimensions were wrong
        setTimeout(() => {
          map.resize();
          console.log('Map resized');
        }, 100);

        // Start the slow living drift once tiles are laid out so the map feels
        // alive on the very first step.
        setTimeout(() => startDrift(), 800);
      });
      
      map.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError(e.error?.message || "Map error");
      });

      // Check if tiles are loading
      map.on('data', (e: any) => {
        if (e.sourceDataType === 'visibility') {
          console.log('Map data event:', e.sourceDataType);
        }
      });

      // Clean up on unmount
      return () => map.remove();
    }).catch((error) => {
      console.error("Failed to load Mapbox:", error);
      setMapError("Failed to load Mapbox");
    });
  }, []); // Empty dependency array - only run once

  // Living drift: instead of RAF-driving easeTo every frame (which is what
  // the old drift did and what caused persistent lag), we kick off a SINGLE
  // long easeTo that Mapbox interpolates internally. When it finishes we
  // chain the next leg. That's 2 easeTo calls per minute vs 60/second.
  const startDrift = () => {
    const m = mapRef.current;
    if (!m) return;
    if (driftTimerRef.current) clearTimeout(driftTimerRef.current);

    let direction = 1;
    const step = () => {
      if (!mapRef.current) return;
      const startZoom = mapRef.current.getZoom();
      const startBearing = mapRef.current.getBearing();
      const legMs = 18000; // 18s per leg — slow and barely-perceptible
      mapRef.current.easeTo({
        zoom: startZoom + 0.15 * direction,
        bearing: startBearing + 4 * direction,
        duration: legMs,
        easing: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t), // smoothstep
      });
      direction *= -1;
      driftTimerRef.current = setTimeout(step, legMs);
    };
    step();
  };

  // Animate to new location when props change or map loads.
  // Mapbox handles the interpolation internally — no RAF loop needed.
  useEffect(() => {
    const m = mapRef.current;
    if (!mapLoaded || !m) return;

    // Cancel any drift chain before a flyTo takes over
    if (driftTimerRef.current) {
      clearTimeout(driftTimerRef.current);
      driftTimerRef.current = null;
    }

    console.log('Animating to:', center, zoom);

    const currentBearing = m.getBearing();
    const currentPitch = m.getPitch();

    // Small incremental changes instead of random values
    const bearing = currentBearing + (Math.random() * 20 - 10); // ±10 from current
    const pitch = currentPitch + (Math.random() * 10 - 5); // ±5 from current, clamped 45–60
    const finalPitch = Math.max(45, Math.min(60, pitch));

    m.flyTo({
      center: center,
      zoom: zoom,
      duration: 3500,
      curve: 1.1,
      speed: 0.6,
      easing: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
      pitch: finalPitch,
      bearing: bearing,
      essential: true,
    });

    // After the flyTo completes, resume the drift from the new position
    const resume = setTimeout(() => startDrift(), 3700);
    return () => clearTimeout(resume);
  }, [center, zoom, mapLoaded]);

  return (
    <>
      <div
        ref={mapContainer}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          background: '#b0b0b0', // grey fallback matching map style before tiles load
        }}
      />
      {mapError && (
        <div className="hidden md:block" style={{ position: 'fixed', top: 10, right: 10, background: 'red', color: 'white', padding: 10, zIndex: 1000 }}>
          Map Error: {mapError}
        </div>
      )}
    </>
  );
}