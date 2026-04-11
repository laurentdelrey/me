'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export function IPadCursor() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [elementBounds, setElementBounds] = useState<DOMRect | null>(null);
  const [isPointer, setIsPointer] = useState(false);

  // Spring config for smooth animations
  const springConfig = { stiffness: 300, damping: 30 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Hide default cursor
    document.body.style.cursor = 'none';

    // Track mouse movement
    const updatePosition = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    // Detect hoverable elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if element is clickable (button, link, or has onClick)
      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.style.cursor === 'pointer' ||
        target.onclick !== null;

      if (isClickable) {
        const clickableElement =
          target.closest('button') ||
          target.closest('a') ||
          target;

        // Skip cursor expansion for elements with data-no-cursor-expand
        const shouldExpand = clickableElement &&
          !(clickableElement as HTMLElement).hasAttribute('data-no-cursor-expand') &&
          !(clickableElement as HTMLElement).closest('[data-no-cursor-expand]');

        if (shouldExpand) {
          setHoveredElement(clickableElement as HTMLElement);
          const bounds = (clickableElement as HTMLElement).getBoundingClientRect();
          setElementBounds(bounds);
        }
        setIsPointer(true);

        // Hide default cursor on hover
        if (clickableElement) {
          (clickableElement as HTMLElement).style.cursor = 'none';
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;

      // Check if we're moving to another clickable element
      const isMovingToClickable =
        relatedTarget?.tagName === 'BUTTON' ||
        relatedTarget?.tagName === 'A' ||
        relatedTarget?.closest('button') ||
        relatedTarget?.closest('a');

      // Only reset if not moving to another clickable element
      if (!isMovingToClickable) {
        setHoveredElement(null);
        setElementBounds(null);
        setIsPointer(false);
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    // Cleanup
    return () => {
      document.body.style.cursor = 'auto';
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [cursorX, cursorY, hoveredElement]);

  const isExpanded = isPointer && !!elementBounds;

  // Calculate cursor size and shape based on hover state
  const cursorSize = isExpanded ? {
    width: elementBounds.width + 16,
    height: elementBounds.height + 8,
  } : {
    width: 16,
    height: 16,
  };

  const cursorPosition = isExpanded ? {
    x: elementBounds.left + elementBounds.width / 2,
    y: elementBounds.top + elementBounds.height / 2,
  } : {
    x: cursorXSpring,
    y: cursorYSpring,
  };

  return (
    <motion.div
      className="pointer-events-none fixed"
      style={{
        left: 0,
        top: 0,
        x: cursorPosition.x,
        y: cursorPosition.y,
        translateX: '-50%',
        translateY: '-50%',
        zIndex: 9999,
      }}
      animate={{
        width: cursorSize.width,
        height: cursorSize.height,
      }}
      transition={{
        type: 'spring',
        stiffness: 250,
        damping: 25,
        mass: 0.5,
      }}
    >
      <motion.div
        className="w-full h-full"
        style={{
          borderRadius: '999px',
        }}
        animate={{
          border: isExpanded ? '0px solid transparent' : '1px solid rgba(255, 255, 255, 0.8)',
          backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
        }}
        transition={{
          type: 'spring',
          stiffness: 250,
          damping: 25,
          mass: 0.5,
        }}
      />
    </motion.div>
  );
}
