'use client';

import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { RefObject, useEffect, useState } from 'react';

export type TimelineTrack = {
  id: string;
  label: string;
  color: string;
  scrollStart: number; // 0-1
  scrollEnd: number;   // 0-1
};

export type VerticalScrollProgressProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  tracks?: TimelineTrack[];
  activeSection?: string;
};

const SPRING = { stiffness: 200, damping: 40, restDelta: 0.001 };

export function VerticalScrollProgress({
  containerRef,
  tracks = [],
  activeSection,
}: VerticalScrollProgressProps) {
  const { scrollYProgress } = useScroll({ container: containerRef });
  const smoothProgress = useSpring(scrollYProgress, SPRING);

  // If no tracks provided, fall back to simple progress bar
  if (tracks.length === 0) {
    return (
      <motion.div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '2px',
          height: '100vh',
          backgroundColor: '#ffffff',
          transformOrigin: 'top',
          scaleY: smoothProgress,
          zIndex: 50,
        }}
      />
    );
  }

  const trackWidth = 2;
  const trackGap = 6;
  const totalWidth = tracks.length * trackWidth + (tracks.length - 1) * trackGap;

  return (
    <div
      style={{
        position: 'fixed',
        left: '12px',
        top: 0,
        height: '100vh',
        width: `${totalWidth + 20}px`,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {tracks.map((track, i) => {
        const isActive = track.id === activeSection;
        const x = i * (trackWidth + trackGap);

        return (
          <div key={track.id} style={{ position: 'absolute', left: x, top: 0, bottom: 0, width: trackWidth }}>
            {/* Track background (full span) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: `${track.scrollStart * 100}%`,
                bottom: `${(1 - track.scrollEnd) * 100}%`,
                width: '100%',
                backgroundColor: track.color,
                opacity: isActive ? 0.4 : 0.1,
                transition: 'opacity 0.5s ease',
                borderRadius: '1px',
              }}
            />

            {/* Active fill — only shows progress within this track */}
            {isActive && (
              <motion.div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: `${track.scrollStart * 100}%`,
                  width: '100%',
                  backgroundColor: track.color,
                  borderRadius: '1px',
                  transformOrigin: 'top',
                  height: `${(track.scrollEnd - track.scrollStart) * 100}%`,
                  scaleY: useTransform(smoothProgress, [track.scrollStart, track.scrollEnd], [0, 1]),
                }}
              />
            )}
          </div>
        );
      })}

      {/* Scroll position marker — horizontal dash across all tracks */}
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          width: `${totalWidth}px`,
          height: '2px',
          backgroundColor: '#ffffff',
          borderRadius: '1px',
          opacity: 0.6,
          top: useTransform(smoothProgress, [0, 1], ['0%', '100%']),
        }}
      />
    </div>
  );
}
