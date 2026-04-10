'use client';

import { motion, SpringOptions, useScroll, useSpring } from 'motion/react';
import { RefObject } from 'react';

export type VerticalScrollProgressProps = {
  className?: string;
  springOptions?: SpringOptions;
  containerRef?: RefObject<HTMLDivElement | null>;
};

const DEFAULT_SPRING_OPTIONS: SpringOptions = {
  stiffness: 200,
  damping: 50,
  restDelta: 0.001,
};

export function VerticalScrollProgress({
  className,
  springOptions,
  containerRef,
}: VerticalScrollProgressProps) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  const scaleY = useSpring(scrollYProgress, {
    ...DEFAULT_SPRING_OPTIONS,
    ...(springOptions ?? {}),
  });

  return (
    <motion.div
      className={className}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '2px',
        height: '100vh',
        backgroundColor: '#ffffff',
        transformOrigin: 'top',
        scaleY,
        zIndex: 50,
      }}
    />
  );
}