"use client";

import React, { useEffect, useState } from "react";

// Minimal word-by-word reveal. Wrapping element fades in words at `delay` ms each.
// Starts revealing immediately on mount — no initial stall.
export function WordReveal({
  children,
  delay = 60,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [visibleWords, setVisibleWords] = useState(0);
  const [total, setTotal] = useState(0);

  // Run once on mount per item. Parent remounts us with a fresh `key`
  // whenever the item changes, so we don't need to react to `children`
  // identity — which would otherwise flip on every upstream re-render
  // (mounted flag, stage timers, hiddenIds fetch, map load, idle tracker)
  // and kick the reveal back to word 0, making short cards never finish.
  useEffect(() => {
    const count = countWords(children);
    setTotal(count);
    setVisibleWords(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(() => setVisibleWords((v) => Math.max(v, i + 1)), delay * i)
      );
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let wordIndex = 0;
  const process = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      if (!node.trim()) return node;
      // Keep whitespace, but drop empty strings that appear at string boundaries
      // (e.g. " and ".split(/(\s+)/) produces ["", " ", "and", " ", ""]) — otherwise
      // those empties would get counted as phantom words and drift wordIndex past
      // what `countWords` expects, leaving trailing links never revealed.
      const parts = node.split(/(\s+)/).filter((p) => p.length > 0);
      return parts.map((part, i) => {
        if (/^\s+$/.test(part)) {
          return <React.Fragment key={i}>{part}</React.Fragment>;
        }
        const idx = wordIndex++;
        const visible = idx < visibleWords;
        return (
          <span
            key={i}
            style={{
              opacity: visible ? 1 : 0.25,
              transition: "opacity 0.3s ease-out",
            }}
          >
            {part}
          </span>
        );
      });
    }
    if (React.isValidElement(node)) {
      const el = node as React.ReactElement<any>;
      // Anchors (pill buttons) fade in AS A UNIT — bg + border + text all together —
      // once all their words have been reached. This avoids empty-looking pills
      // and keeps the pill chrome in sync with the text it represents.
      if (el.type === "a" && el.props.style) {
        const linkWords = countWords(el.props.children);
        const endIdx = wordIndex + linkWords;
        const allVisible = endIdx <= visibleWords;
        // Advance wordIndex past this link's words so subsequent words line up.
        wordIndex = endIdx;
        return React.cloneElement(el, {
          ...el.props,
          style: {
            ...el.props.style,
            opacity: allVisible ? 1 : 0,
            transform: allVisible ? "scale(1)" : "scale(0.7)",
            transformOrigin: "center",
            // easeOutBack — gives the pill a little overshoot as it pops in
            transition:
              "opacity 0.25s ease-out, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          },
        });
      }
      // For span with muted color, match opacity
      if (el.type === "span" && el.props.style) {
        const spanWords = countWords(el.props.children);
        const endIdx = wordIndex + spanWords;
        const allVisible = endIdx <= visibleWords;
        const originalColor = el.props.style.color;
        const children = React.Children.map(el.props.children, process);
        return React.cloneElement(el, {
          ...el.props,
          style: {
            ...el.props.style,
            color: allVisible ? originalColor : "rgba(255,255,255,0.25)",
            transition: "color 0.3s ease-out",
          },
          children,
        });
      }
      if (el.props.children) {
        return React.cloneElement(el, {
          ...el.props,
          children: React.Children.map(el.props.children, process),
        });
      }
      return el;
    }
    if (Array.isArray(node)) return node.map(process);
    return node;
  };

  return <div>{React.Children.map(children, process)}</div>;
}

function countWords(node: React.ReactNode): number {
  let n = 0;
  const visit = (x: React.ReactNode) => {
    if (typeof x === "string") {
      n += x.trim().split(/\s+/).filter((w) => w.length > 0).length;
    } else if (React.isValidElement(x)) {
      React.Children.forEach((x as any).props.children, visit);
    } else if (Array.isArray(x)) {
      x.forEach(visit);
    }
  };
  React.Children.forEach(node, visit);
  return n;
}
