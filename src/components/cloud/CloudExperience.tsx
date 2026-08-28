"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Cube, Heart, Smiley, Star } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { tagMatchesFilter, type TagFilter } from "@/lib/work/tags";
import { STORY_SECTIONS } from "@/lib/work/story";
import StoryText from "./StoryText";
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

// ---- icons: Phosphor — filled when active, outlined when not --------------

function ShapeIcon({ shape, active }: { shape: CloudShape; active: boolean }) {
  const weight = active ? "fill" : "regular";
  const size = 20;
  if (shape === "sphere") return <Circle size={size} weight={weight} />;
  if (shape === "heart") return <Heart size={size} weight={weight} />;
  if (shape === "cube") return <Cube size={size} weight={weight} />;
  if (shape === "star") return <Star size={size} weight={weight} />;
  return <Smiley size={size} weight={weight} />;
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
      4200
    );
    return () => clearInterval(t);
  }, [shape, aboutHover]);

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

  // today first, backwards through time; the press section closes it out
  const aboutSections = useMemo(() => {
    const eras = STORY_SECTIONS.slice(0, -1).reverse();
    return [...eras, STORY_SECTIONS[STORY_SECTIONS.length - 1]];
  }, []);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const aboutScrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollUntil = useRef(0);

  // the system reads section by section — keep the one it's on in view
  useEffect(() => {
    if (shape !== "about" || aboutHover !== null) return;
    autoScrollUntil.current = Date.now() + 900;
    sectionRefs.current[aboutAuto]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [shape, aboutAuto, aboutHover]);

  // manual scrolling hands the annotation to whichever section is centered
  const onAboutScroll = () => {
    if (Date.now() < autoScrollUntil.current) return;
    const box = aboutScrollRef.current?.getBoundingClientRect();
    if (!box) return;
    const mid = box.top + box.height / 2;
    let best = 0;
    let bestD = Infinity;
    sectionRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setAboutAuto((a) => (a === best ? a : best));
  };

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
            ? { top: 16, left: 16, x: 0, y: 0, width: 88 }
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
            ref={aboutScrollRef}
            onScroll={onAboutScroll}
            className="pointer-events-auto max-h-[calc(100vh-230px)] w-[min(540px,calc(100vw-72px))] overflow-y-auto overflow-x-hidden px-1 py-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, black 56px, black calc(100% - 56px), transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, black 56px, black calc(100% - 56px), transparent)",
            }}
            onMouseLeave={() => setAboutHover(null)}
          >
            {aboutSections.map((sec, i) => {
              const accent = CV.fallback[i % CV.fallback.length];
              const active = aboutActive === i;
              return (
                <motion.div
                  key={i}
                  ref={(el) => {
                    sectionRefs.current[i] = el;
                  }}
                  onMouseEnter={() => setAboutHover(i)}
                  initial={false}
                  animate={{ opacity: active ? 1 : 0.42 }}
                  transition={{ duration: 0.45 }}
                  className="relative mb-3 px-3.5 py-2.5"
                  style={{
                    border: `1px solid ${active ? accent : "transparent"}`,
                    transition: "border-color 450ms ease",
                  }}
                >
                  <motion.span
                    initial={false}
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute -top-px left-[-1px] max-w-full -translate-y-full truncate whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight"
                    style={{ background: accent, color: textOn(accent) }}
                  >
                    {sec.label} · {sec.years} · {sec.city}
                  </motion.span>
                  <StoryText runs={sec.runs} active={active} />
                </motion.div>
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
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              transition={SPRING}
              className="cursor-pointer leading-none text-black/75 transition-colors duration-200 hover:text-black"
            >
              <ShapeIcon shape={s.id} active={shape === s.id} />
            </motion.button>
          ))}
        </div>

        {/* filters: bare labels, centered */}
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5">
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
          {shape === "about" ? "close" : "about me"}
        </motion.button>
      </motion.div>
    </div>
  );
}
