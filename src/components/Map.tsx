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
        style: `mapbox://styles/laurentdelrey/clw9xnyx600ah01ql0ebq5ee5`, // Custom monochrome style (cacheable — removed ?fresh=true)
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

        // Fog removed — in a fully-grey scene it renders an extra pass per frame
        // for no visible difference. Restore setFog() if we ever un-grey things.

        // Desaturate map to light grey tones matching #BFBFBF
        const style = map.getStyle();
        if (style?.layers) {
          for (const layer of style.layers) {
            try {
              if (layer.type === 'background') {
                map.setPaintProperty(layer.id, 'background-color', '#b0b0b0');
              } else if (layer.type === 'fill') {
                map.setPaintProperty(layer.id, 'fill-color', '#b8b8b8');
                try { map.setPaintProperty(layer.id, 'fill-outline-color', '#aaaaaa'); } catch {}
              } else if (layer.type === 'line') {
                map.setPaintProperty(layer.id, 'line-color', '#a0a0a0');
              } else if (layer.type === 'symbol') {
                try { map.setPaintProperty(layer.id, 'text-color', '#999999'); } catch {}
                try { map.setPaintProperty(layer.id, 'text-halo-color', '#b8b8b8'); } catch {}
              }
            } catch {}
          }
        }
        
        // Signal that the map is ready.
        requestAnimationFrame(() => {
          if (onLoad) onLoad();
        });
        
        // Let the custom map style handle all labels without overrides

        setMapLoaded(true);

        // Force a resize in case container dimensions were wrong
        setTimeout(() => {
          map.resize();
          console.log('Map resized');
        }, 100);

        // Drift doesn't start here anymore — it starts only after the first
        // flyTo completes (i.e. we've left tldr and the map is actually visible).
        // No point animating the map behind an opaque grey veil.
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

    // Skip no-op flyTo: if the map is already at the requested location, don't
    // run a 3.5s animation to nowhere (with random bearing/pitch jitter) —
    // that's pure wasted GPU behind the grey veil on the first step.
    const cur = m.getCenter();
    const lngDelta = Math.abs(cur.lng - center[0]);
    const latDelta = Math.abs(cur.lat - center[1]);
    const zoomDelta = Math.abs(m.getZoom() - zoom);
    if (lngDelta < 0.001 && latDelta < 0.001 && zoomDelta < 0.01) return;

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