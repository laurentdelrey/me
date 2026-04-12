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
        left: '28px',
        top,
        transform: 'translateY(-50%)',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.2s ease, color 0.5s ease',
        whiteSpace: 'nowrap',
        pointerEvents: isHovered ? 'auto' : 'none',
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

// "free" always on lane 1, everything else lane 0
function assignLanes(tracks: TimelineTrack[]): number[] {
  return tracks.map((t) => (t.id === 'free' ? 1 : 0));
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

  const lanes = assignLanes(tracks);
  const trackWidth = 2;
  const laneGap = 5;
  const showLabels = (isHovered || isDwell) && !isScrolling;

  return (
    <div
      style={{
        position: 'fixed',
        left: '32px',
        top: '70px',
        height: 'calc(100vh - 70px)',
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
                  backgroundColor: isActive ? track.color : '#ffffff',
                  opacity: isActive ? 0.5 : 0.3,
                  transition: 'background-color 0.5s ease, opacity 0.5s ease',
                  borderRadius: '1px',
                }}
              />

              {isActive && (
                <TrackFill scrollProgress={smoothProgress} track={track} />
              )}
            </div>

            <TrackLabel
              track={track}
              isActive={isActive}
              isHovered={showLabels}
              onClick={() => onNavigate?.(track.id)}
            />
          </div>
        );
      })}

      <ScrollMarker scrollProgress={smoothProgress} />
    </div>
  );
}
