'use client';

import { motion, useScroll, useSpring, useTransform, MotionValue } from 'motion/react';
import { RefObject, useState, useEffect } from 'react';

export type TimelineTrack = {
  id: string;
  label: string;
  color: string;
  // Where the track is drawn on the bar (time-based, 0-1)
  displayStart: number;
  displayEnd: number;
  // What scroll range maps to 0-100% fill (scroll-based, 0-1)
  scrollStart: number;
  scrollEnd: number;
};

export type TimelineBracket = {
  id: string;
  label: string;
  color: string;
  displayStart: number;
  displayEnd: number;
  scrollStart: number;
  scrollEnd: number;
};

export type VerticalScrollProgressProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  tracks?: TimelineTrack[];
  brackets?: TimelineBracket[];
  activeSection?: string;
  onNavigate?: (sectionId: string) => void;
};

const SPRING = { stiffness: 200, damping: 40, restDelta: 0.001 };

// Always-mounted segment with background + progressive fill
// displayStart/displayEnd = where it's drawn (time-based)
// scrollStart/scrollEnd = what scroll range drives the fill (scroll-based)
function TrackSegment({
  track,
  isActive,
  scrollProgress,
}: {
  track: TimelineTrack | TimelineBracket;
  isActive: boolean;
  scrollProgress: MotionValue<number>;
}) {
  const ds = (track as any).displayStart ?? track.scrollStart;
  const de = (track as any).displayEnd ?? track.scrollEnd;

  const fillScale = useTransform(scrollProgress, (v) => {
    if (v <= track.scrollStart) return 0;
    if (v >= track.scrollEnd) return 1;
    return (v - track.scrollStart) / (track.scrollEnd - track.scrollStart);
  });

  return (
    <>
      {/* Background — positioned by display range */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: `${ds * 100}%`,
          bottom: `${(1 - de) * 100}%`,
          width: '100%',
          backgroundColor: '#ffffff',
          opacity: 0.15,
          borderRadius: '1px',
        }}
      />

      {/* Fill — positioned by display range, driven by scroll range */}
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          top: `${ds * 100}%`,
          width: '100%',
          backgroundColor: track.color,
          borderRadius: '1px',
          transformOrigin: 'top',
          height: `${(de - ds) * 100}%`,
          scaleY: fillScale,
          opacity: 0.8,
        }}
      />
    </>
  );
}


function TrackLabel({
  track,
  isActive,
  isVisible,
  onClick,
}: {
  track: { id: string; label: string; color: string; scrollStart: number; scrollEnd: number };
  isActive: boolean;
  isVisible: boolean;
  onClick?: () => void;
}) {
  const ds = (track as any).displayStart ?? track.scrollStart;
  const de = (track as any).displayEnd ?? track.scrollEnd;
  const midpoint = (ds + de) / 2;
  const top = `${midpoint * 100}%`;

  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: '28px',
        top,
        transform: 'translateY(-50%)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease, color 0.5s ease',
        whiteSpace: 'nowrap',
        pointerEvents: isVisible ? 'auto' : 'none',
        background: 'none',
        border: 'none',
        padding: '4px 0',
        cursor: 'none',
        fontSize: '0.7rem',
        color: isActive ? track.color : '#ffffff',
        fontWeight: isActive ? 500 : 400,
        textTransform: 'lowercase',
      }}
    >
      {track.label}
    </button>
  );
}

export function VerticalScrollProgress({
  containerRef,
  tracks = [],
  brackets = [],
  activeSection,
  onNavigate,
}: VerticalScrollProgressProps) {
  const { scrollYProgress } = useScroll({ container: containerRef });
  const smoothProgress = useSpring(scrollYProgress, SPRING);
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDwell, setIsDwell] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let scrollTimeout: ReturnType<typeof setTimeout>;
    let dwellTimeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setIsScrolling(true);
      setIsDwell(false);
      clearTimeout(scrollTimeout);
      clearTimeout(dwellTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        dwellTimeout = setTimeout(() => setIsDwell(true), 300);
      }, 600);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    dwellTimeout = setTimeout(() => setIsDwell(true), 1500);
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(dwellTimeout);
    };
  }, [containerRef]);

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

  const mainLineX = 0;
  const bracketX = 8; // bracket line offset to the right
  const showLabels = (isHovered || isDwell) && !isScrolling;

  return (
    <div
      style={{
        position: 'fixed',
        left: '32px',
        top: '70px',
        height: 'calc(100vh - 70px)',
        width: '140px',
        zIndex: 50,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main career line — single lane, all fills always rendered */}
      <div style={{ position: 'absolute', left: mainLineX, top: 0, bottom: 0, width: 2 }}>
        {tracks.map((track) => (
          <TrackSegment
            key={track.id}
            track={track}
            isActive={track.id === activeSection}
            scrollProgress={smoothProgress}
          />
        ))}
      </div>

      {/* Brackets — side annotations for overlapping projects */}
      {brackets.map((bracket) => (
          <div key={bracket.id}>
            <div style={{ position: 'absolute', left: bracketX, top: 0, bottom: 0, width: 2 }}>
              <TrackSegment
                track={bracket}
                isActive={false}
                scrollProgress={smoothProgress}
              />
            </div>

            <TrackLabel
              track={bracket}
              isActive={false}
              isVisible={showLabels}
              onClick={() => onNavigate?.(bracket.id)}
            />
          </div>
      ))}

      {/* Main track labels — skip empty labels */}
      {tracks.filter(t => t.label).map((track) => (
        <TrackLabel
          key={track.id}
          track={track}
          isActive={track.id === activeSection}
          isVisible={showLabels}
          onClick={() => onNavigate?.(track.id)}
        />
      ))}
    </div>
  );
}
