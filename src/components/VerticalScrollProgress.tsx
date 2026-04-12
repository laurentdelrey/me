'use client';

import { motion, useScroll, useSpring, useTransform, MotionValue } from 'motion/react';
import { RefObject, useState, useEffect } from 'react';

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
  onNavigate?: (sectionId: string) => void;
};

const SPRING = { stiffness: 200, damping: 40, restDelta: 0.001 };

// Check if two tracks overlap in their scroll range
function tracksOverlap(a: TimelineTrack, b: TimelineTrack): boolean {
  return a.scrollStart < b.scrollEnd && b.scrollStart < a.scrollEnd;
}

// Assign horizontal lanes: 0 = shared lane, offset only when overlapping
function assignLanes(tracks: TimelineTrack[]): number[] {
  const lanes: number[] = new Array(tracks.length).fill(0);
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      if (tracksOverlap(tracks[i], tracks[j])) {
        // Push the later track to a new lane
        lanes[j] = Math.max(lanes[j], lanes[i] + 1);
      }
    }
  }
  return lanes;
}

function TrackFill({
  scrollProgress,
  track,
}: {
  scrollProgress: MotionValue<number>;
  track: TimelineTrack;
}) {
  const scaleY = useTransform(
    scrollProgress,
    [track.scrollStart, track.scrollEnd],
    [0, 1]
  );

  return (
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
        scaleY,
      }}
    />
  );
}

function ScrollMarker({
  scrollProgress,
}: {
  scrollProgress: MotionValue<number>;
}) {
  const top = useTransform(scrollProgress, [0, 1], ['0%', '100%']);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '-2px',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        top,
        translateY: '-50%',
      }}
    />
  );
}

function TrackLabel({
  track,
  isActive,
  isHovered,
  onClick,
}: {
  track: TimelineTrack;
  isActive: boolean;
  isHovered: boolean;
  onClick?: () => void;
}) {
  const midpoint = (track.scrollStart + track.scrollEnd) / 2;
  const top = `${midpoint * 100}%`;

  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: '16px',
        top,
        transform: 'translateY(-50%)',
        opacity: isHovered ? (isActive ? 1 : 0.5) : 0,
        transition: 'opacity 0.2s ease',
        whiteSpace: 'nowrap',
        pointerEvents: isHovered ? 'auto' : 'none',
        background: 'none',
        border: 'none',
        padding: '2px 0',
        cursor: 'none',
        fontSize: '0.7rem',
        color: track.color,
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
  activeSection,
  onNavigate,
}: VerticalScrollProgressProps) {
  const { scrollYProgress } = useScroll({ container: containerRef });
  const smoothProgress = useSpring(scrollYProgress, SPRING);
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDwell, setIsDwell] = useState(false);

  // Show labels on dwell (idle after scrolling stops), hide during scroll
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
        // After scroll stops, show labels briefly
        dwellTimeout = setTimeout(() => setIsDwell(true), 300);
      }, 600);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    // Show labels initially after mount
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
          top: '56px',
          width: '2px',
          height: 'calc(100vh - 56px)',
          backgroundColor: '#ffffff',
          transformOrigin: 'top',
          scaleY: smoothProgress,
          zIndex: 50,
        }}
      />
    );
  }

  const lanes = assignLanes(tracks);
  const trackWidth = 2;
  const laneGap = 5;
  const showLabels = (isHovered || isDwell) && !isScrolling;

  return (
    <div
      style={{
        position: 'fixed',
        left: '32px',
        top: '52px',
        height: 'calc(100vh - 52px)',
        width: '120px',
        zIndex: 50,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {tracks.map((track, i) => {
        const isActive = track.id === activeSection;
        const lane = lanes[i];
        const x = lane * (trackWidth + laneGap);

        return (
          <div key={track.id}>
            <div style={{ position: 'absolute', left: x, top: 0, bottom: 0, width: trackWidth }}>
              {/* Track background */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: `${track.scrollStart * 100}%`,
                  bottom: `${(1 - track.scrollEnd) * 100}%`,
                  width: '100%',
                  backgroundColor: track.color,
                  opacity: isActive ? 0.5 : 0.12,
                  transition: 'opacity 0.5s ease',
                  borderRadius: '1px',
                }}
              />

              {/* Active fill */}
              {isActive && (
                <TrackFill scrollProgress={smoothProgress} track={track} />
              )}
            </div>

            {/* Label that appears on hover */}
            <TrackLabel
              track={track}
              isActive={isActive}
              isHovered={showLabels}
              onClick={() => onNavigate?.(track.id)}
            />
          </div>
        );
      })}

      {/* Scroll marker dot */}
      <ScrollMarker scrollProgress={smoothProgress} />
    </div>
  );
}
