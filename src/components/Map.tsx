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
  const [mapError, setMapError] = useState<string>("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [preloading, setPreloading] = useState(true);

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
        style: `mapbox://styles/laurentdelrey/clw9xnyx600ah01ql0ebq5ee5?fresh=true`, // Custom monochrome style
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

        // Set fog/atmosphere to grey
        try {
          map.setFog({
            color: '#b0b0b0',
            'high-color': '#b0b0b0',
            'horizon-blend': 0.1,
            'space-color': '#b0b0b0',
            'star-intensity': 0,
          });
        } catch {}

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
        
        // Only preload the first-visible era location. The rest load on demand
        // when flyTo navigates there — tile fetches are gated to real need
        // instead of front-loaded into the intro. Big intro-lag win.
        requestAnimationFrame(() => {
          setPreloading(false);
          if (onLoad) onLoad();
        });
        
        // Let the custom map style handle all labels without overrides

        setMapLoaded(true);

        // Force a resize in case container dimensions were wrong
        setTimeout(() => {
          map.resize();
          console.log('Map resized');
        }, 100);
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
          opacity: preloading ? 0 : 1,
          background: '#b0b0b0', // grey fallback matching map style
          transition: preloading ? 'none' : 'opacity 800ms ease-out'
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