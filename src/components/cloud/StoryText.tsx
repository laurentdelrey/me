"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { prepareWithSegments, measureNaturalWidth } from "@chenglou/pretext";
import type { StoryRun } from "@/lib/work/story";

// Word-level animated text layout, powered by pretext (pretext.cool).
// Words are measured once, then glide between the small and large layouts —
// a real re-wrap, animated with transforms instead of font-size reflow.

const BASE = 16.5; // px, active
const MIN = 13; // px, inactive
const LINE_H = 29; // px at BASE
const FONT = `${BASE}px Inter, -apple-system, sans-serif`;

type WordPart = { text: string; href?: string };
type Word = { parts: WordPart[]; w: number };

const SPRING = { type: "spring" as const, stiffness: 240, damping: 32 };

function measureWords(runs: StoryRun[]): { words: Word[]; spaceW: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const spaceW = ctx ? ((ctx.font = FONT), ctx.measureText(" ").width) : 4.5;

  // build words; tokens that abut across run boundaries (a link's trailing
  // comma, "threads.") merge into one unbreakable word with mixed parts
  const words: { parts: WordPart[] }[] = [];
  let open = false;
  for (const run of runs) {
    const tokens = run.t.split(" ");
    tokens.forEach((tok, idx) => {
      if (!tok) return;
      if (idx === 0 && !run.t.startsWith(" ") && open && words.length) {
        words[words.length - 1].parts.push({ text: tok, href: run.href });
      } else {
        words.push({ parts: [{ text: tok, href: run.href }] });
      }
    });
    open = run.t !== "" && !run.t.endsWith(" ");
  }

  return {
    words: words.map(({ parts }) => {
      const text = parts.map((p) => p.text).join("");
      let w: number;
      try {
        w = measureNaturalWidth(prepareWithSegments(text, FONT));
      } catch {
        w = ctx ? ctx.measureText(text).width : text.length * 8;
      }
      return { parts, w };
    }),
    spaceW,
  };
}

export default function StoryText({
  runs,
  active,
}: {
  runs: StoryRun[];
  active: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hostW, setHostW] = useState(0);
  const [measured, setMeasured] = useState<{
    words: Word[];
    spaceW: number;
  } | null>(null);

  // measure after the webfont is in; re-measure never (text is static)
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) setMeasured(measureWords(runs));
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(run);
    } else {
      run();
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setHostW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const size = active ? BASE : MIN;
  const k = size / BASE;

  // greedy wrap at the current size; positions in final pixels
  const layoutData = useMemo(() => {
    if (!measured || hostW <= 0) return null;
    const { words, spaceW } = measured;
    const pos: { x: number; y: number }[] = [];
    let x = 0;
    let line = 0;
    for (const word of words) {
      const w = word.w * k;
      if (x > 0 && x + w > hostW) {
        x = 0;
        line++;
      }
      pos.push({ x, y: line * LINE_H * k });
      x += w + spaceW * k;
    }
    return { pos, height: (line + 1) * LINE_H * k };
  }, [measured, hostW, k]);

  const linkClass =
    "pointer-events-auto underline decoration-black/30 underline-offset-2 transition-colors hover:decoration-black/80";

  // static fallback until fonts and widths are in
  if (!layoutData || !measured) {
    return (
      <div ref={hostRef}>
        <p className="text-left text-[16.5px] lowercase leading-[1.75] tracking-[-0.005em] text-[#141417]">
          {runs.map((r, i) =>
            r.href ? (
              <a key={i} href={r.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {r.t}
              </a>
            ) : (
              <span key={i}>{r.t}</span>
            )
          )}
        </p>
      </div>
    );
  }

  return (
    <div ref={hostRef}>
      <motion.div
        className="relative"
        initial={false}
        animate={{ height: layoutData.height }}
        transition={SPRING}
      >
        {measured.words.map((word, i) => {
          const p = layoutData.pos[i];
          return (
            <motion.span
              key={i}
              className="absolute left-0 top-0 origin-top-left whitespace-nowrap text-[16.5px] lowercase leading-[1.75] tracking-[-0.005em] text-[#141417]"
              initial={false}
              animate={{ x: p.x, y: p.y, scale: k }}
              transition={SPRING}
            >
              {word.parts.map((part, j) =>
                part.href ? (
                  <a
                    key={j}
                    href={part.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    {part.text}
                  </a>
                ) : (
                  <span key={j}>{part.text}</span>
                )
              )}
            </motion.span>
          );
        })}
      </motion.div>
    </div>
  );
}
