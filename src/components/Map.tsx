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
  const animationRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
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
        
        // Preload all location tiles and flight paths
        const locations = [
          { center: [-118.5976, 34.0378], zoom: 12.5 }, // Topanga
          { center: [-118.4912, 34.0195], zoom: 12.5 }, // Santa Monica
          { center: [-118.4691, 33.9871], zoom: 12.5 }, // Venice
          { center: [-122.4194, 37.7749], zoom: 12 }, // SF
          { center: [2.3618, 48.8709], zoom: 13.5 }, // 10th arrondissement
          { center: [2.2885, 48.8412], zoom: 13.5 }, // 15th arrondissement
          { center: [2.5185, 48.8407], zoom: 13 }, // Bry-sur-Marne
        ];
        
        // Key flight paths to preload at wider zoom levels
        const flightPaths = [
          // US West to East Coast
          { center: [-95, 39], zoom: 4 }, // Middle of US
          { center: [-105, 40], zoom: 5 }, // Western US
          { center: [-85, 40], zoom: 5 }, // Eastern US
          
          // Europe to US (Atlantic crossing)
          { center: [-30, 50], zoom: 3 }, // Mid-Atlantic
          { center: [0, 48], zoom: 5 }, // Western Europe
          { center: [-50, 45], zoom: 4 }, // Eastern Atlantic
          
          // California regional
          { center: [-119, 34], zoom: 7 }, // Southern California overview
          { center: [-120, 37], zoom: 7 }, // Northern California overview
        ];
        
        let preloadIndex = 0;
        const allLocations = [...locations, ...flightPaths];
        
        const preloadNext = () => {
          if (preloadIndex < allLocations.length) {
            const loc = allLocations[preloadIndex];
            map.jumpTo({
              center: loc.center as [number, number],
              zoom: loc.zoom,
              pitch: 50,
              bearing: 0
            });
            console.log(`Preloading tiles ${preloadIndex + 1}/${allLocations.length}`);
            preloadIndex++;
            setTimeout(preloadNext, 25);
          } else {
            // Return to initial position
            map.jumpTo({
              center: center,
              zoom: zoom,
              pitch: 50,
              bearing: 0
            });
            console.log('Preloading complete, returning to initial position');
            setTimeout(() => {
            // Fade-in after brief frame to avoid flash
            requestAnimationFrame(() => {
              setPreloading(false);
              if (onLoad) onLoad();
            });
            }, 200);
          }
        };
        
        // Start preloading
        setTimeout(preloadNext, 100);
        
        // Let the custom map style handle all labels without overrides

        setMapLoaded(true);
        
        // Start the initial drift animation after a short delay
        setTimeout(() => {
          startDriftAnimation();
        }, 100);
        
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

  // Drift animation function
  const startDriftAnimation = () => {
    if (!mapRef.current) return;
    
    // Clean up any existing drift animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const startZoom = mapRef.current.getZoom();
    const startBearing = mapRef.current.getBearing();
    let startTime = Date.now();

    const drift = () => {
      if (!mapRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const t = elapsed / 30000; // 30 second cycle
      
      // Subtle zoom oscillation
      const zoomDrift = startZoom + Math.sin(t * Math.PI) * 0.15;
      
      // Slow rotation
      const bearingDrift = (startBearing + (t * 5)) % 360;
      
      mapRef.current.easeTo({
        zoom: zoomDrift,
        bearing: bearingDrift,
        duration: 100,
        easing: (t: number) => t,
      });
      
      animationRef.current = requestAnimationFrame(drift);
    };

    drift();
  };

  // Animate to new location when props change or map loads
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Clean up any existing animations
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    console.log('Animating to:', center, zoom);
    
    // Keep the current bearing and pitch, only change slightly
    const currentBearing = mapRef.current.getBearing();
    const currentPitch = mapRef.current.getPitch();
    
    // Small incremental changes instead of random values
    const bearing = currentBearing + (Math.random() * 20 - 10); // ±10 degrees from current
    const pitch = currentPitch + (Math.random() * 10 - 5); // ±5 degrees from current, clamped between 45-60
    const finalPitch = Math.max(45, Math.min(60, pitch));
    
    mapRef.current.flyTo({
      center: center,
      zoom: zoom,
      duration: 3500, // Back to slower animation
      curve: 1.1, // Gentler arc
      speed: 0.6, // Slower speed
      easing: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t, // Smooth ease-in-out
      pitch: finalPitch,
      bearing: bearing,
      essential: true,
    });

    // After landing, start a subtle continuous drift
    timeoutRef.current = setTimeout(() => {
      startDriftAnimation();
    }, 3600); // Start drift after animation completes

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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