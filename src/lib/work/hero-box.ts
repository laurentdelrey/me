import type { MediaTimelineItem } from "@/lib/work/timeline";

// Hero sits between the top (below header) and the filmstrip — must stay
// in sync with HeroMedia's TOP_MARGIN / BOTTOM_MARGIN constants.
export const HERO_TOP_MARGIN = 80;
export const HERO_BOTTOM_MARGIN = 200;

const HERO_W_MAX = 920;
const HERO_H_VH = 0.58;
const HERO_H_MAX = 580;

export type Box = { x: number; y: number; w: number; h: number };

/**
 * Computes the rendered viewport-coords box of the hero media for a given
 * item. Returns the IMAGE box (aspect-preserved), centered within the hero
 * region. Used to position the morph element so it perfectly matches what the
 * hero used to render.
 */
export function computeHeroBox(
  item: MediaTimelineItem,
  vw: number,
  vh: number,
  isMobile: boolean,
): Box {
  const heroWidthVw = isMobile ? 0.9 : 0.68;
  const heroMaxW = Math.min(heroWidthVw * vw, HERO_W_MAX);
  const heroMaxH = Math.min(HERO_H_VH * vh, HERO_H_MAX);

  const intrinsicW = item.media.width || 1;
  const intrinsicH = item.media.height || 1;
  const aspect = intrinsicW / intrinsicH;
  const boxAspect = heroMaxW / heroMaxH;

  let w: number;
  let h: number;
  if (aspect >= boxAspect) {
    w = heroMaxW;
    h = heroMaxW / aspect;
  } else {
    h = heroMaxH;
    w = heroMaxH * aspect;
  }

  // Center horizontally; vertically center within the (top, bottom) band.
  const bandTop = HERO_TOP_MARGIN;
  const bandHeight = Math.max(0, vh - HERO_TOP_MARGIN - HERO_BOTTOM_MARGIN);
  const x = (vw - w) / 2;
  const y = bandTop + (bandHeight - h) / 2;
  return { x, y, w, h };
}
