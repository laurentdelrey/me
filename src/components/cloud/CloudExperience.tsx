"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { tagMatchesFilter, type TagFilter } from "@/lib/work/tags";
import { STORY_SECTIONS } from "@/lib/work/story";
import CloudScene, {
  CV,
  CLOUD_BG,
  type CloudControls,
  type CloudEra,
  type CloudItem,
  type CloudShape,
} from "./CloudScene";

// readable text on an accent: white on dark tones, black on bright ones
function textOn(color: string): string {
  const n = parseInt(color.slice(1), 16);
  const lum =
    0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#000" : "#fff";
}

// ---- mini dot-matrix icons: tiny clouds shaped like the shapes -------------

type Dot = [number, number, number]; // x, y, opacity

// unified top-left lighting so every icon shares the cube's shaded feel
function lit(x: number, y: number): number {
  return Math.min(1, Math.max(0.35, 0.92 - (x + y) / 42));
}

function starBoundary(theta: number): number {
  const R = 11;
  const RIN = 4.8;
  const m = 10;
  const seg = (2 * Math.PI) / m;
  let a = (theta + Math.PI / 2) % seg;
  if (a < 0) a += seg;
  const even = Math.floor(((theta + Math.PI / 2) / seg + m * 2) % 2) === 0;
  const r1 = even ? R : RIN;
  const r2 = even ? RIN : R;
  const x1 = r1;
  const y1 = 0;
  const x2 = r2 * Math.cos(seg);
  const y2 = r2 * Math.sin(seg);
  const denom = (y2 - y1) * Math.cos(a) - (x2 - x1) * Math.sin(a);
  if (Math.abs(denom) < 1e-6) return r1;
  return (x1 * y2 - x2 * y1) / denom;
}

function shapeDots(shape: CloudShape): Dot[] {
  const pts: Dot[] = [];
  if (shape === "sphere") {
    for (let y = -10; y <= 10; y += 2)
      for (let x = -10; x <= 10; x += 2)
        if (x * x + y * y <= 100) pts.push([x, y, lit(x, y)]);
  } else if (shape === "heart") {
    for (let y = -10; y <= 10; y += 2)
      for (let x = -10; x <= 10; x += 2) {
        const nx = x / 9.6;
        const ny = -y / 9.6 + 0.12;
        const a = nx * nx + ny * ny - 1;
        if (a * a * a - nx * nx * ny * ny * ny <= 0)
          pts.push([x, y, lit(x, y)]);
      }
  } else if (shape === "cube") {
    // front face + two shifted layers for the top and right faces
    const cols = [-7.9, -5.3, -2.7, -0.1];
    const rows = [-0.1, 2.5, 5.1, 7.7];
    for (const y of rows) for (const x of cols) pts.push([x, y, lit(x, y)]);
    for (let d = 1; d <= 2; d++) {
      for (const x of cols) pts.push([x + d * 2.4, -0.1 - d * 2.4, 0.55]);
      for (const y of rows) pts.push([-0.1 + d * 2.4, y - d * 2.4, 0.35]);
    }
  } else if (shape === "star") {
    for (let y = -11; y <= 11; y += 2)
      for (let x = -11; x <= 11; x += 2) {
        const r = Math.hypot(x, y);
        if (r < 0.1 || r <= Math.abs(starBoundary(Math.atan2(y, x))))
          pts.push([x, y, lit(x, y)]);
      }
  } else {
    // smiley: a lit disc with the eyes and smile carved out
    for (let y = -10; y <= 10; y += 2)
      for (let x = -10; x <= 10; x += 2) {
        if (x * x + y * y > 100) continue;
        const eye = Math.abs(Math.abs(x) - 3.6) <= 1.2 && y >= -6 && y <= -2;
        const r = Math.hypot(x, y);
        const smile = r >= 4.6 && r <= 7.4 && y >= 2.6;
        if (eye || smile) continue;
        pts.push([x, y, lit(x, y)]);
      }
  }
  // fixed precision so server and client render byte-identical SVGs
  return pts.map(([x, y, o]) => [
    Math.round(x * 100) / 100,
    Math.round(y * 100) / 100,
    Math.round(o * 100) / 100,
  ]);
}

// Dots shimmer in on load and magnify under the cursor, dock-style.
function ShapeIcon({ shape }: { shape: CloudShape }) {
  const dots = useMemo(() => shapeDots(shape), [shape]);
  const [pt, setPt] = useState<[number, number] | null>(null);
  return (
    <svg
      width={26}
      height={26}
      viewBox="-13 -13 26 26"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPt([
          ((e.clientX - r.left) / r.width) * 26 - 13,
          ((e.clientY - r.top) / r.height) * 26 - 13,
        ]);
      }}
      onMouseLeave={() => setPt(null)}
    >
      {dots.map(([x, y, o], i) => {
        let sc = 1;
        if (pt) {
          const d2 = (x - pt[0]) ** 2 + (y - pt[1]) ** 2;
          sc = 1 + 1.1 * Math.exp(-d2 / 14);
        }
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${sc.toFixed(2)})`}>
            <rect
              x={-0.85}
              y={-0.85}
              width={1.7}
              height={1.7}
              fill="currentColor"
              opacity={o}
              style={{
                animation: `cloud-dot-in 480ms ease ${(i * 9) % 460}ms backwards`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

// Same spring family as the site header: soft, one gentle beat, no cartoon.
const SPRING = { type: "spring" as const, stiffness: 480, damping: 30, mass: 0.8 };

const SHAPES: { id: CloudShape; title: string }[] = [
  { id: "sphere", title: "sphere" },
  { id: "heart", title: "heart" },
  { id: "cube", title: "cube" },
  { id: "smiley", title: "smiley" },
  { id: "star", title: "star" },
];

// Color story: black = the frame/system; each card's annotations take an
// accent sampled from its own image. The labels stay bare and neutral.
const FILTERS: { id: TagFilter; label: string }[] = [
  { id: "story", label: "all" },
  { id: "prototypes", label: "prototypes" },
  { id: "images", label: "images" },
];

const LABEL_ON = "text-black/80";
const LABEL_OFF = "text-black/30 hover:text-black/55";

export default function CloudExperience({
  items,
  eras,
}: {
  items: CloudItem[];
  eras: CloudEra[];
}) {
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<TagFilter>("story");
  const [shape, setShape] = useState<CloudShape>("sphere");
  const [hoverItem, setHoverItem] = useState<CloudItem | null>(null);
  const [hoverAccent, setHoverAccent] = useState<string | null>(null);
  const [focused, setFocused] = useState<CloudItem | null>(null);
  const [focusAccent, setFocusAccent] = useState<string | null>(null);
  // about mode: which story section the annotation system is reading
  const [aboutAuto, setAboutAuto] = useState(0);
  const [aboutHover, setAboutHover] = useState<number | null>(null);

  const controlsRef = useRef<CloudControls>({
    filter: "story",
    unfocusToken: 0,
    shape: "sphere",
    started: false,
  });

  useEffect(() => {
    if (shape !== "about" || aboutHover !== null) return;
    const t = setInterval(
      () => setAboutAuto((a) => (a + 1) % STORY_SECTIONS.length),
      3200
    );
    return () => clearInterval(t);
  }, [shape, aboutHover]);

  const handleReady = () => {
    controlsRef.current.started = true;
    setReady(true);
  };

  const handleFilter = (f: TagFilter) => {
    setFilter(f);
    controlsRef.current.filter = f;
  };

  const handleShape = (s: CloudShape) => {
    setShape(s);
    controlsRef.current.shape = s;
  };

  const count = useMemo(
    () => items.filter((it) => tagMatchesFilter(it.tag, filter)).length,
    [items, filter]
  );

  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const aboutActive = aboutHover ?? aboutAuto;

  const cityOf = (item: CloudItem | null) =>
    item ? eras.find((e) => e.id === item.eraId)?.city : undefined;

  const labelItem = focused ?? hoverItem;
  const labelColor = (focused ? focusAccent : hoverAccent) ?? CV.fallback[0];
  const labelText = textOn(labelColor);

  // Top-left tag: date · location when inspecting a card, else the header.
  const frameLabel = labelItem ? (
    <span
      className="block whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight"
      style={{ background: labelColor, color: labelText }}
    >
      {labelItem.date}
      {cityOf(labelItem) ? ` · ${cityOf(labelItem)}` : ""}
    </span>
  ) : (
    <span
      className="block cursor-default whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight text-white"
      style={{ background: CV.frame }}
    >
      laurent del rey&rsquo;s {shape === "about" ? "story" : activeFilter.label} · {count}
    </span>
  );

  // Bottom-right tag: the caption. On a focused card it links to the X post.
  const frameCaption = labelItem
    ? focused && focused.url
      ? (
        <a
          href={focused.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto block max-w-[340px] truncate whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight lowercase hover:brightness-110"
          style={{ background: labelColor, color: labelText }}
        >
          {focused.text || focused.date} ↗
        </a>
      )
      : labelItem.text
        ? (
          <span
            className="block max-w-[340px] truncate whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight lowercase"
            style={{ background: labelColor, color: labelText }}
          >
            {labelItem.text}
          </span>
        )
        : null
    : null;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: CLOUD_BG }}>
      <style jsx global>{`
        @keyframes cloud-dot-in {
          from {
            opacity: 0;
          }
        }
      `}</style>

      {/* the logo waits center stage while the archive loads, then takes
          its corner as the cloud flies in */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <motion.img
        src="/images/pfp.svg"
        alt="laurent del rey"
        className="pointer-events-none absolute z-[5]"
        initial={false}
        animate={
          ready
            ? { top: 8, left: 8, x: 0, y: 0, width: 88 }
            : { top: "50%", left: "50%", x: "-50%", y: "-50%", width: 148 }
        }
        transition={{ type: "spring", stiffness: 180, damping: 26 }}
      />

      <CloudScene
        items={items}
        controlsRef={controlsRef}
        onHoverItem={(item, accent) => {
          setHoverItem(item);
          setHoverAccent(accent);
        }}
        onFocusChange={(item, accent) => {
          setFocused(item);
          setFocusAccent(accent);
        }}
        onReady={handleReady}
        frameLabel={frameLabel}
        frameCaption={frameCaption}
        frameColor={CV.frame}
      />

      {/* about me: the annotation system reads the story, section by section */}
      {shape === "about" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-10">
          <div
            className="pointer-events-auto max-h-[calc(100vh-270px)] w-[min(500px,calc(100vw-72px))] overflow-y-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseLeave={() => setAboutHover(null)}
          >
            {STORY_SECTIONS.map((sec, i) => {
              const accent = CV.fallback[i % CV.fallback.length];
              const active = aboutActive === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setAboutHover(i)}
                  className="relative mb-2 px-3 py-2 transition-colors duration-300"
                  style={{
                    border: `1px solid ${active ? accent : "transparent"}`,
                  }}
                >
                  {active && (
                    <span
                      className="absolute -top-px left-[-1px] -translate-y-full whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight"
                      style={{ background: accent, color: textOn(accent) }}
                    >
                      {sec.label} · {sec.years} · {sec.city}
                    </span>
                  )}
                  <p className="text-left text-[14px] lowercase leading-[1.75] tracking-[-0.005em] text-[#1f1f23]">
                    {sec.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* bottom fade so the controls always sit on clear grey */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[15] h-40"
        style={{
          background: `linear-gradient(to top, ${CLOUD_BG} 30%, transparent)`,
        }}
      />

      {/* controls fade in once the cloud is up */}
      <motion.div
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.5, delay: ready ? 0.4 : 0 }}
        style={{ pointerEvents: ready ? undefined : "none" }}
      >
        {/* shape icons: a stack in the bottom-left corner */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col items-center gap-2.5">
          {SHAPES.map((s) => (
            <motion.button
              key={s.id}
              title={s.title}
              onClick={() => handleShape(s.id)}
              whileTap={{ scale: 0.85 }}
              transition={SPRING}
              className={`cursor-pointer leading-none transition-colors duration-200 ${
                shape === s.id ? LABEL_ON : "text-black/25 hover:text-black/50"
              }`}
            >
              <ShapeIcon shape={s.id} />
            </motion.button>
          ))}
        </div>

        {/* filters: bare labels, centered */}
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5">
          {FILTERS.map((f) => (
            <motion.button
              key={f.id}
              onClick={() => handleFilter(f.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              transition={SPRING}
              className={`cursor-pointer text-[13px] lowercase leading-none transition-colors duration-200 ${
                filter === f.id ? LABEL_ON : LABEL_OFF
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* about me: top-right, bare label */}
        <motion.button
          onClick={() => handleShape(shape === "about" ? "sphere" : "about")}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={SPRING}
          className={`absolute right-4 top-4 z-20 cursor-pointer whitespace-nowrap text-[13px] lowercase leading-none transition-colors duration-200 ${
            shape === "about" ? LABEL_ON : LABEL_OFF
          }`}
        >
          about me
        </motion.button>
      </motion.div>
    </div>
  );
}
