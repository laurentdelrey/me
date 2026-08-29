"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { tagMatchesFilter, type TagFilter } from "@/lib/work/tags";
import { STORY_SECTIONS, type StoryRun } from "@/lib/work/story";
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

// Same spring family as the site header: soft, one gentle beat, no cartoon.
const SPRING = { type: "spring" as const, stiffness: 480, damping: 30, mass: 0.8 };

const LAYOUTS: { id: CloudShape; label: string }[] = [
  { id: "sphere", label: "sphere" },
  { id: "heart", label: "heart" },
  { id: "smiley", label: "smiley" },
  { id: "star", label: "star" },
  { id: "grid", label: "grid" },
];

// Color story: black = the frame/system; each card's annotations take an
// accent sampled from its own image. The labels stay bare and neutral.
const FILTERS: { id: TagFilter; label: string }[] = [
  { id: "story", label: "all" },
  { id: "prototypes", label: "prototypes" },
  { id: "images", label: "images" },
];

// Fixed annotation colors per story section — snap yellow, meta blue,
// everything else distinct.
const SECTION_COLORS: Record<string, string> = {
  today: "#26262b",
  meta: "#2979ff",
  "free ideas": "#ff2fae",
  "snap, inc.": "#ffd400",
  "a quest called tribe": "#00c853",
  "hustling for fun": "#ff6d00",
  "lost in the game": "#7c4dff",
  "another internet kid": "#00bcd4",
};

const LABEL_ON = "text-black/80";
const LABEL_OFF = "text-black/30 hover:text-black/55";


// Character-level label morph: unchanged characters hold still, the rest
// cascade out and in with a subtle spring.
function MorphLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {text.split("").map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            initial={{ opacity: 0, y: 11 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 480,
                damping: 30,
                delay: i * 0.018,
              },
            }}
            exit={{
              opacity: 0,
              y: -11,
              transition: { duration: 0.13, delay: i * 0.012 },
            }}
            className="inline-block whitespace-pre"
          >
            {ch}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

function StoryParagraph({ runs, accent }: { runs: StoryRun[]; accent: string }) {
  return (
    <p className="text-left text-[17px] lowercase leading-[1.6] tracking-[-0.008em] text-[#1f1f23]">
      {runs.map((r, i) =>
        r.br ? (
          <span key={i} aria-hidden className="block h-2" />
        ) : r.href ? (
          <a
            key={i}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto underline underline-offset-2 transition-colors hover:text-[color:var(--acc)]"
            style={{ "--acc": accent, textDecorationColor: accent } as CSSProperties}
          >
            {r.t}
          </a>
        ) : (
          <span key={i}>{r.t}</span>
        )
      )}
    </p>
  );
}

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

  const controlsRef = useRef<CloudControls>({
    filter: "story",
    unfocusToken: 0,
    shape: "sphere",
    started: false,
  });


  // Esc leaves the about page
  useEffect(() => {
    if (shape !== "about") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleShape("sphere");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  const mountAt = useRef(0);
  useEffect(() => {
    mountAt.current = performance.now();
  }, []);

  // let the in-scene flipbook play at least 4s before the cloud takes over
  const handleReady = () => {
    const elapsed = mountAt.current ? performance.now() - mountAt.current : 0;
    const wait = Math.max(0, 4000 - elapsed);
    setTimeout(() => {
      controlsRef.current.started = true;
      setReady(true);
    }, wait);
  };

  const handleFilter = (f: TagFilter) => {
    setFilter(f);
    controlsRef.current.filter = f;
  };

  const handleShape = (s: CloudShape) => {
    setShape(s);
    controlsRef.current.shape = s;
  };

  // chevron pager over the layouts; remembers the last one during about
  const lastLayout = useRef<CloudShape>("sphere");
  useEffect(() => {
    if (shape !== "about") lastLayout.current = shape;
  }, [shape]);
  const layoutIndex = Math.max(
    0,
    LAYOUTS.findIndex(
      (l) => l.id === (shape === "about" ? lastLayout.current : shape)
    )
  );
  const [pagerDir, setPagerDir] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pickerOpen]);
  const stepLayout = (dir: number) => {
    setPagerDir(dir);
    const next = LAYOUTS[(layoutIndex + dir + LAYOUTS.length) % LAYOUTS.length];
    handleShape(next.id);
  };

  // ←/→ page through layouts when no card is expanded (the scene uses the
  // same keys to step through cards while one is focused)
  useEffect(() => {
    if (shape === "about" || focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") stepLayout(1);
      else if (e.key === "ArrowLeft") stepLayout(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, focused, layoutIndex]);

  const count = useMemo(
    () => items.filter((it) => tagMatchesFilter(it.tag, filter)).length,
    [items, filter]
  );

  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const controlsShown = ready && shape !== "about";
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const filtersShown = controlsShown && !(pickerOpen && isNarrow);
  // the big 0.55s reveal delay is for the first entrance only — after that,
  // stepping aside for the picker snaps back quickly
  const revealedOnce = useRef(false);
  useEffect(() => {
    if (!controlsShown) return;
    const t = setTimeout(() => {
      revealedOnce.current = true;
    }, 1400);
    return () => clearTimeout(t);
  }, [controlsShown]);

  // today first, backwards through time; press links live in each section
  const aboutSections = useMemo(() => [...STORY_SECTIONS].reverse(), []);

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
      {/* cropped mark, optically on the 16px grid; sits behind the cards */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/pfp-mark.svg"
        alt="laurent del rey"
        className="pointer-events-none absolute left-[30px] top-[30px] h-[52px] w-auto sm:left-6 sm:top-4"
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

      {/* about me: the story, annotated era by era */}
      {shape === "about" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div
            className="pointer-events-auto max-h-[calc(100%-48px)] w-[min(600px,calc(100vw-72px))] overflow-y-auto overflow-x-hidden px-1 pb-28 pt-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, black 110px, black calc(100% - 110px), transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, black 110px, black calc(100% - 110px), transparent)",
            }}
          >
            {aboutSections.map((sec, i) => {
              const accent = SECTION_COLORS[sec.label] ?? CV.fallback[i % 5];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 28,
                    delay: 0.25 + i * 0.08,
                  }}
                  className="mb-8"
                >
                  <span
                    className="block w-fit max-w-full truncate whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight"
                    style={{ background: accent, color: textOn(accent) }}
                  >
                    {sec.label} · {sec.years} · {sec.city}
                  </span>
                  <div
                    className="px-3.5 py-2.5"
                    style={{ border: `1px solid ${accent}` }}
                  >
                    <StoryParagraph runs={sec.runs} accent={accent} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* bottom fade so the controls always sit on clear grey; in about mode
          there are no controls, so it drops low and lets the story breathe */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[15] h-[130px] transition-[height] duration-500 ease-out sm:h-44"
        style={{
          background: `linear-gradient(to top, ${CLOUD_BG} 30%, rgba(191,191,191,0.85) 50%, rgba(191,191,191,0.55) 68%, rgba(191,191,191,0.25) 84%, rgba(191,191,191,0))`,
        }}
      />

      {/* about: twitter/x + threads under the story */}
      {shape === "about" && (
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-6">
          {(
            [
              ["twitter/x", "https://x.com/laurentdelrey"],
              ["threads", "https://threads.com/laurentdelrey"],
              ["telegram", "https://t.me/laurentdelrey"],
            ] as const
          ).map(([label, href], i) => (
            <motion.a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 26,
                delay: 0.6 + i * 0.07,
              }}
              className="text-[17px] lowercase leading-none text-black/45 transition-colors duration-200 hover:text-black"
            >
              {label}
            </motion.a>
          ))}
        </div>
      )}

      {/* bottom controls hide in about mode — close (top right) is the way out */}
      <div>
        {/* layout picker: centered above the filters on mobile, anchored
            bottom-left on desktop; chevrons closed, unfolds into the list */}
        <div
          ref={pickerRef}
          onMouseEnter={() => setPickerOpen(true)}
          onMouseLeave={() => setPickerOpen(false)}
          className="absolute bottom-5 left-[30px] z-20 sm:left-5"
        >
        <motion.div
          initial={false}
          animate={{
            opacity: controlsShown ? 1 : 0,
            y: controlsShown ? 0 : 22,
          }}
          transition={
            controlsShown
              ? {
                  type: "spring",
                  stiffness: 210,
                  damping: 26,
                  delay: revealedOnce.current ? 0.05 : 0.45,
                }
              : { duration: 0.2 }
          }
          style={{ pointerEvents: controlsShown ? undefined : "none" }}
          className="flex h-9 items-center text-[17px] lowercase leading-none"
        >
          <AnimatePresence mode="wait" initial={false}>
          {pickerOpen ? (
            <motion.div key="list" className="flex items-center gap-4 px-1">
              {LAYOUTS.map((l, idx) => (
                <motion.button
                  key={l.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: idx * 0.035 } }}
                  exit={{
                    opacity: 0,
                    y: 4,
                    transition: {
                      duration: 0.12,
                      delay: (LAYOUTS.length - 1 - idx) * 0.018,
                    },
                  }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    handleShape(l.id);
                    setPickerOpen(false);
                  }}
                  className={`cursor-pointer transition-colors duration-200 ${
                    l.id === LAYOUTS[layoutIndex].id
                      ? "text-black/85"
                      : "text-black/35 hover:text-black/70"
                  }`}
                >
                  {l.label}
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="pager"
              className="flex items-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 170, damping: 24 },
              }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
            >
              <motion.button
                onClick={() => stepLayout(-1)}
                whileHover={{ scale: 1.2, x: -2 }}
                whileTap={{ scale: 0.8 }}
                transition={SPRING}
                className="grid h-8 w-8 cursor-pointer place-items-center text-black/35 transition-colors hover:text-black"
              >
                <CaretLeft size={15} weight="bold" />
              </motion.button>
              <button
                onClick={() => setPickerOpen(true)}
                className="relative block h-[20px] w-[64px] cursor-pointer overflow-hidden text-center text-black/85"
              >
                <AnimatePresence initial={false} custom={pagerDir}>
                  <motion.span
                    key={LAYOUTS[layoutIndex].label}
                    custom={pagerDir}
                    variants={{
                      enter: (d: number) => ({ x: d * 22, opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (d: number) => ({ x: d * -22, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={SPRING}
                    className="absolute inset-0"
                  >
                    {LAYOUTS[layoutIndex].label}
                  </motion.span>
                </AnimatePresence>
              </button>
              <motion.button
                onClick={() => stepLayout(1)}
                whileHover={{ scale: 1.2, x: 2 }}
                whileTap={{ scale: 0.8 }}
                transition={SPRING}
                className="grid h-8 w-8 cursor-pointer place-items-center text-black/35 transition-colors hover:text-black"
              >
                <CaretRight size={15} weight="bold" />
              </motion.button>
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
        </div>

        {/* filters: centered under the picker on mobile, bottom-right on desktop */}
        <div
          style={{ pointerEvents: filtersShown ? undefined : "none" }}
          className="absolute bottom-5 right-[30px] z-20 flex h-9 items-center gap-6 sm:right-6"
        >
          {FILTERS.map((f, idx) => (
            <motion.button
              key={f.id}
              onClick={() => handleFilter(f.id)}
              whileTap={{ scale: 0.92 }}
              initial={false}
              animate={{
                opacity: filtersShown ? 1 : 0,
                y: filtersShown ? 0 : 14,
              }}
              transition={
                filtersShown
                  ? {
                      type: "spring",
                      stiffness: 240,
                      damping: 26,
                      delay: (revealedOnce.current ? 0.22 : 0.55) + idx * 0.07,
                    }
                  : {
                      duration: 0.14,
                      delay: (FILTERS.length - 1 - idx) * 0.025,
                    }
              }
              className={`cursor-pointer text-[17px] lowercase leading-none transition-colors duration-200 ${
                filter === f.id
                  ? "text-black/85"
                  : "text-black/35 hover:text-black/70"
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* about me / close: top-right, bare label */}
      <motion.button
        onClick={() => handleShape(shape === "about" ? lastLayout.current : "about")}
        whileTap={{ scale: 0.94 }}
        initial={false}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : -14 }}
        transition={
          ready
            ? { type: "spring", stiffness: 210, damping: 26, delay: 0.5 }
            : { duration: 0.25 }
        }
        className="absolute right-[30px] top-[30px] z-20 cursor-pointer sm:right-4 sm:top-4 whitespace-nowrap text-[17px] lowercase leading-none text-black/80 transition-colors duration-200 hover:text-black"
      >
        <MorphLabel text={shape === "about" ? "close" : "about me"} />
      </motion.button>
    </div>
  );
}
