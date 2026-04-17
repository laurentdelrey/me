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
  }, [children, delay]);

  let wordIndex = 0;
  const process = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      const trimmed = node;
      if (!trimmed.trim()) return node;
      const parts = trimmed.split(/(\s+)/); // keep whitespace
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
      // For anchors, we also want them to fade in as their words become visible.
      if (el.type === "a" && el.props.style) {
        const linkWords = countWords(el.props.children);
        const endIdx = wordIndex + linkWords;
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
