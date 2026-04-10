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
        left: '32px',
        top: '52px',
        width: '1px',
        height: 'calc(100vh - 52px)',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        transformOrigin: 'top',
        scaleY,
        zIndex: 50,
      }}
    />
  );
}