import type { MediaTimelineItem, TimelineItem } from "@/lib/work/timeline";

export const MOSAIC_GAP = 6;

export type MosaicTile = {
  item: MediaTimelineItem;
  timelineIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MosaicResult = {
  tiles: MosaicTile[];
  totalHeight: number;
  /** scale applied to the inner mosaic when it overshoots the available height */
  overflowScale: number;
  /** full content width of the mosaic (== cw) */
  cw: number;
};

export function keyForMedia(item: MediaTimelineItem): string {
  return `${item.tweetId}-${item.mediaIndex}`;
}

export function mediaItemsFromTimeline(
  timeline: TimelineItem[],
): { item: MediaTimelineItem; timelineIndex: number }[] {
  const out: { item: MediaTimelineItem; timelineIndex: number }[] = [];
  for (let i = 0; i < timeline.length; i++) {
    const it = timeline[i];
    if (it.kind === "media") out.push({ item: it, timelineIndex: i });
  }
  return out;
}

/**
 * Justified mosaic (Flickr-style): greedy-pack rows at a target height, then
 * scale each row to fill the container width exactly. One re-pass adjusts the
 * target so the grid fits the available height as closely as possible.
 *
 * Returns absolute (x, y, w, h) per tile in mosaic-local coordinates (origin
 * top-left of the mosaic content box).
 */
export function computeMosaic(
  entries: { item: MediaTimelineItem; timelineIndex: number }[],
  cw: number,
  ch: number,
): MosaicResult {
  if (entries.length === 0 || cw <= 0 || ch <= 0) {
    return { tiles: [], totalHeight: 0, overflowScale: 1, cw };
  }

  const items = entries.map((e) => e.item);
  const aspects = items.map((it) => {
    const w = it.media.width || 1;
    const h = it.media.height || 1;
    return Math.max(0.45, Math.min(2.6, w / h));
  });

  const pack = (rowHeight: number) => {
    type RowDraft = { indices: number[]; widths: number[] };
    const rows: RowDraft[] = [];
    let curIdx: number[] = [];
    let curW: number[] = [];
    let curSum = 0;
    const finalize = () => {
      if (curIdx.length === 0) return;
      rows.push({ indices: curIdx, widths: curW });
      curIdx = [];
      curW = [];
      curSum = 0;
    };
    for (let i = 0; i < items.length; i++) {
      const w = rowHeight * aspects[i];
      const gapsIfAdded = MOSAIC_GAP * curIdx.length;
      if (curIdx.length > 0 && curSum + w + gapsIfAdded > cw) finalize();
      curIdx.push(i);
      curW.push(w);
      curSum += w;
    }
    finalize();

    const rowBlocks: { widths: number[]; height: number }[] = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const gaps = MOSAIC_GAP * Math.max(0, row.indices.length - 1);
      const sumW = row.widths.reduce((a, b) => a + b, 0);
      const fillRatio = (sumW + gaps) / cw;
      const isLast = r === rows.length - 1;
      const shouldScale = !isLast || fillRatio > 0.78;
      if (shouldScale) {
        const targetContent = cw - gaps;
        const scale = targetContent / sumW;
        rowBlocks.push({
          widths: row.widths.map((w) => w * scale),
          height: rowHeight * scale,
        });
      } else {
        rowBlocks.push({ widths: row.widths, height: rowHeight });
      }
    }

    const tiles: MosaicTile[] = [];
    let y = 0;
    for (let r = 0; r < rowBlocks.length; r++) {
      const block = rowBlocks[r];
      const row = rows[r];
      let x = 0;
      for (let i = 0; i < row.indices.length; i++) {
        const entry = entries[row.indices[i]];
        tiles.push({
          item: entry.item,
          timelineIndex: entry.timelineIndex,
          x,
          y,
          w: block.widths[i],
          h: block.height,
        });
        x += block.widths[i] + MOSAIC_GAP;
      }
      y += block.height + MOSAIC_GAP;
    }
    return { tiles, totalHeight: y - MOSAIC_GAP };
  };

  let target = Math.sqrt((cw * ch) / items.length) * 0.9;
  let out = pack(target);
  for (let i = 0; i < 4; i++) {
    if (out.totalHeight <= 0) break;
    const ratio = ch / out.totalHeight;
    if (Math.abs(ratio - 1) < 0.01) break;
    target *= 1 + (ratio - 1) * 0.6;
    out = pack(target);
  }

  const overflowScale =
    out.totalHeight > ch && out.totalHeight > 0 ? ch / out.totalHeight : 1;
  return { ...out, overflowScale, cw };
}

export type MosaicLayout = {
  insetTop: number;
  insetSides: number;
  insetBottom: number;
  cw: number;
  ch: number;
};

export function mosaicLayoutFor(
  vw: number,
  vh: number,
  isMobile: boolean,
): MosaicLayout {
  const insetTop = isMobile ? 64 : 84;
  const insetBottom = isMobile ? 16 : 24;
  const insetSides = isMobile ? 12 : 24;
  const cw = Math.max(100, vw - insetSides * 2);
  const ch = Math.max(100, vh - insetTop - insetBottom);
  return { insetTop, insetSides, insetBottom, cw, ch };
}
