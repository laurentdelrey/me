"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineItem } from "@/lib/work/timeline";

type Mode = "playing" | "paused-hover" | "paused-user";

type UseAutoplayOptions = {
  timeline: TimelineItem[];
  imageDurationMs?: number;
  eraIntroDurationMs?: number;
  videoSafetyMs?: number;
  userIdleMs?: number;
};

export function useAutoplay({
  timeline,
  imageDurationMs = 2000,
  eraIntroDurationMs = 5500,
  videoSafetyMs = 12000,
  userIdleMs = 4000,
}: UseAutoplayOptions) {
  const [baseIndex, setBaseIndex] = useState(0);
  const [hoverIndex, setHoverIndexState] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("playing");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineLenRef = useRef(timeline.length);
  timelineLenRef.current = timeline.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setBaseIndex((i) => {
      const next = i + 1;
      if (next >= timelineLenRef.current) return 0; // loop
      return next;
    });
  }, []);

  // Schedule timer when in playing mode and viewing a non-video item
  useEffect(() => {
    clearTimer();
    if (mode !== "playing") return;
    if (timeline.length === 0) return;

    const item = timeline[baseIndex];
    if (!item) return;

    // For media items, only set a timer for images (videos advance via onEnded)
    if (item.kind === "media") {
      if (item.media.type === "video" || item.media.type === "animated_gif") {
        // Safety timeout in case video doesn't fire onEnded
        const dur = item.media.durationMs || videoSafetyMs;
        timerRef.current = setTimeout(advance, Math.min(dur + 500, videoSafetyMs));
      } else {
        timerRef.current = setTimeout(advance, imageDurationMs);
      }
    } else {
      // eraIntro, tldr, social
      timerRef.current = setTimeout(advance, eraIntroDurationMs);
    }

    return clearTimer;
  }, [mode, baseIndex, timeline, imageDurationMs, eraIntroDurationMs, videoSafetyMs, advance, clearTimer]);

  const setHoverIndex = useCallback(
    (idx: number | null) => {
      setHoverIndexState(idx);
      if (idx !== null) {
        setMode("paused-hover");
      } else {
        // Resume playing from baseIndex
        setMode("playing");
      }
    },
    []
  );

  const jumpTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(timelineLenRef.current - 1, idx));
    setBaseIndex(clamped);
    setHoverIndexState(null);
    setMode("playing");
  }, []);

  const onVideoEnded = useCallback(() => {
    if (mode === "playing") advance();
  }, [mode, advance]);

  // Keep baseIndex in bounds if timeline shrinks (e.g., hiding tweets)
  useEffect(() => {
    if (timeline.length > 0 && baseIndex >= timeline.length) {
      setBaseIndex(timeline.length - 1);
    }
  }, [timeline.length, baseIndex]);

  const currentIndex = hoverIndex ?? baseIndex;

  return {
    currentIndex,
    baseIndex,
    hoverIndex,
    mode,
    setHoverIndex,
    jumpTo,
    onVideoEnded,
  };
}
