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

// A bracket annotation that spans a range on the side
export type TimelineBracket = {
  id: string;
  label: string;
  color: string;
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

function BracketFill({
  scrollProgress,
  bracket,
}: {
  scrollProgress: MotionValue<number>;
  bracket: TimelineBracket;
}) {
  const scaleY = useTransform(
    scrollProgress,
    [bracket.scrollStart, bracket.scrollEnd],
    [0, 1]
  );

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        top: `${bracket.scrollStart * 100}%`,
        width: '100%',
        backgroundColor: bracket.color,
        borderRadius: '1px',
        transformOrigin: 'top',
        height: `${(bracket.scrollEnd - bracket.scrollStart) * 100}%`,
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
  isVisible,
  onClick,
}: {
  track: { id: string; label: string; color: string; scrollStart: number; scrollEnd: number };
  isActive: boolean;
  isVisible: boolean;
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
      {/* Main career line — single lane */}
      <div style={{ position: 'absolute', left: mainLineX, top: 0, bottom: 0, width: 2 }}>
        {tracks.map((track) => {
          const isActive = track.id === activeSection;
          return (
            <div key={track.id}>
              {/* Track background segment */}
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

              {/* Active fill */}
              {isActive && (
                <TrackFill scrollProgress={smoothProgress} track={track} />
              )}
            </div>
          );
        })}

      </div>

      {/* Brackets — side annotations for overlapping projects */}
      {brackets.map((bracket) => {
        // Check if scroll is within this bracket's range
        const isInRange = activeSection && tracks.some(t => {
          if (t.scrollStart >= bracket.scrollStart && t.scrollStart < bracket.scrollEnd) {
            return t.id === activeSection;
          }
          return false;
        });

        return (
          <div key={bracket.id}>
            <div style={{ position: 'absolute', left: bracketX, top: 0, bottom: 0, width: 2 }}>
              {/* Bracket background */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: `${bracket.scrollStart * 100}%`,
                  bottom: `${(1 - bracket.scrollEnd) * 100}%`,
                  width: '100%',
                  backgroundColor: bracket.color,
                  opacity: isInRange ? 0.3 : 0.1,
                  transition: 'opacity 0.5s ease',
                  borderRadius: '1px',
                }}
              />

              {/* Bracket fill — progresses with scroll */}
              <BracketFill scrollProgress={smoothProgress} bracket={bracket} />
            </div>

            {/* Bracket label */}
            <TrackLabel
              track={bracket}
              isActive={!!isInRange}
              isVisible={showLabels}
              onClick={() => onNavigate?.(bracket.id)}
            />
          </div>
        );
      })}

      {/* Main track labels */}
      {tracks.map((track) => (
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
