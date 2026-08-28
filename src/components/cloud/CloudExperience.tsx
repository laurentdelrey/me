"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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

// ---- crisp solid icons, one optical family --------------------------------

function ShapeIcon({ shape }: { shape: CloudShape }) {
  const id = useId();
  if (shape === "sphere") {
    return (
      <svg width={20} height={20} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8.4" fill="currentColor" />
      </svg>
    );
  }
  if (shape === "heart") {
    return (
      <svg width={20} height={20} viewBox="0 0 20 20">
        <path
          fill="currentColor"
          d="M10 17.4 C4.9 13.7 2.4 10.7 2.4 7.5 C2.4 5.1 4.3 3.2 6.5 3.2 C7.9 3.2 9.3 4 10 5.3 C10.7 4 12.1 3.2 13.5 3.2 C15.7 3.2 17.6 5.1 17.6 7.5 C17.6 10.7 15.1 13.7 10 17.4 Z"
        />
      </svg>
    );
  }
  if (shape === "cube") {
    return (
      <svg width={20} height={20} viewBox="0 0 20 20">
        <polygon points="10,1.6 17.6,6 10,10.4 2.4,6" fill="currentColor" />
        <polygon
          points="2.4,6 10,10.4 10,18.8 2.4,14.4"
          fill="currentColor"
          opacity="0.55"
        />
        <polygon
          points="17.6,6 10,10.4 10,18.8 17.6,14.4"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    );
  }
  if (shape === "star") {
    return (
      <svg width={20} height={20} viewBox="0 0 20 20">
        <polygon points="10.00,1.20 12.17,7.01 18.37,7.28 13.52,11.14 15.17,17.12 10.00,13.70 4.83,17.12 6.48,11.14 1.63,7.28 7.83,7.01" fill="currentColor" />
      </svg>
    );
  }
  // smiley: eyes and smile knocked out of a solid disc
  return (
    <svg width={20} height={20} viewBox="0 0 20 20">
      <mask id={id}>
        <rect width="20" height="20" fill="#fff" />
        <circle cx="7" cy="7.9" r="1.15" fill="#000" />
        <circle cx="13" cy="7.9" r="1.15" fill="#000" />
        <path
          d="M6 11.4 Q10 15 14 11.4"
          stroke="#000"
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
        />
      </mask>
      <circle cx="10" cy="10" r="8.4" fill="currentColor" mask={`url(#${id})`} />
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
      4200
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

  // today first, backwards through time; the press section closes it out
  const aboutSections = useMemo(() => {
    const eras = STORY_SECTIONS.slice(0, -1).reverse();
    return [...eras, STORY_SECTIONS[STORY_SECTIONS.length - 1]];
  }, []);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // the system reads section by section — keep the one it's on in view
  useEffect(() => {
    if (shape !== "about" || aboutHover !== null) return;
    sectionRefs.current[aboutAuto]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [shape, aboutAuto, aboutHover]);

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
            className="pointer-events-auto max-h-[calc(100vh-230px)] w-[min(540px,calc(100vw-72px))] overflow-y-auto px-1 py-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  animate={{ scale: active ? 1.015 : 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
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
                    className="absolute -top-px left-[-1px] -translate-y-full whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight"
                    style={{ background: accent, color: textOn(accent) }}
                  >
                    {sec.label} · {sec.years} · {sec.city}
                  </motion.span>
                  <p
                    className={`text-left lowercase tracking-[-0.005em] transition-all duration-500 ${
                      active
                        ? "text-[16.5px] leading-[1.75] text-[#141417]"
                        : "text-[13px] leading-[1.7] text-[#1f1f23]/40"
                    }`}
                  >
                    {sec.body}
                  </p>
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
          className={`absolute right-4 top-[34px] z-20 cursor-pointer whitespace-nowrap text-[13px] lowercase leading-none transition-colors duration-200 ${
            shape === "about" ? LABEL_ON : LABEL_OFF
          }`}
        >
          about me
        </motion.button>
      </motion.div>
    </div>
  );
}
