"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Search,
} from "lucide-react";

import tweetsData from "@/data/tweets.json";
import duplicatesData from "@/data/duplicates.json";
import type { MediaItem, Tweet } from "@/types/tweet";
import { heuristicTag, type MediaTag } from "@/lib/work/tags";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type TagValue = MediaTag;
type TagOverrideValue = TagValue | "auto";

type DuplicateInfo = {
  canonical: string;
  kind: "exact" | "near";
  distance?: number;
};
type DuplicatesPayload = {
  duplicates: Record<string, DuplicateInfo>;
};

type FilterTab = "all" | "visible" | "hidden" | "duplicates";

type Row = {
  tweet: Tweet;
  media: MediaItem;
  mediaIndex: number;
  totalMedia: number;
  key: string;
  hidden: boolean;
  duplicateOf?: DuplicateInfo;
  heuristic: TagValue;
  override?: TagValue;
  effective: TagValue;
};

export default function DashboardPage() {
  const tweets = tweetsData as Tweet[];
  const duplicates = (duplicatesData as DuplicatesPayload).duplicates;

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [tagOverrides, setTagOverrides] = useState<Record<string, TagValue>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [tagPending, setTagPending] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  // Which row's detail dialog is open (null = none).
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hiddenRes, tagsRes] = await Promise.all([
          fetch("/api/hidden", { cache: "no-store" }),
          fetch("/api/tags", { cache: "no-store" }),
        ]);
        if (hiddenRes.ok) {
          const data = (await hiddenRes.json()) as { ids: string[] };
          if (!cancelled) setHiddenIds(new Set(data.ids ?? []));
        }
        if (tagsRes.ok) {
          const data = (await tagsRes.json()) as {
            overrides: Record<string, TagValue>;
          };
          if (!cancelled && data?.overrides) setTagOverrides(data.overrides);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = [];
    for (const tweet of tweets) {
      const withBlobs = tweet.media.filter((m) => m.blobUrl);
      if (withBlobs.length === 0) continue;
      withBlobs.forEach((media, mediaIndex) => {
        const key = `${tweet.id}:${mediaIndex}`;
        const heuristic = heuristicTag(media);
        const override = tagOverrides[key];
        all.push({
          tweet,
          media,
          mediaIndex,
          totalMedia: withBlobs.length,
          key,
          hidden: hiddenIds.has(key),
          duplicateOf: duplicates[key],
          heuristic,
          override,
          effective: override ?? heuristic,
        });
      });
    }

    const q = query.trim().toLowerCase();
    return all
      .filter((r) => {
        if (filter === "visible" && r.hidden) return false;
        if (filter === "hidden" && !r.hidden) return false;
        if (filter === "duplicates" && !r.duplicateOf) return false;
        if (!q) return true;
        return (
          r.tweet.text.toLowerCase().includes(q) || r.tweet.id.includes(q)
        );
      })
      .sort((a, b) => {
        if (a.tweet.date !== b.tweet.date)
          return a.tweet.date < b.tweet.date ? 1 : -1;
        if (a.tweet.id !== b.tweet.id)
          return a.tweet.id < b.tweet.id ? 1 : -1;
        return a.mediaIndex - b.mediaIndex;
      });
  }, [tweets, hiddenIds, tagOverrides, filter, query, duplicates]);

  const openRow = openKey ? rows.find((r) => r.key === openKey) ?? null : null;

  const counts = useMemo(() => {
    let visible = 0;
    let hidden = 0;
    let duplicateCount = 0;
    let duplicateStillVisible = 0;
    for (const tweet of tweets) {
      const withBlobs = tweet.media.filter((m) => m.blobUrl);
      withBlobs.forEach((_m, i) => {
        const key = `${tweet.id}:${i}`;
        const isHidden = hiddenIds.has(key);
        if (isHidden) hidden++;
        else visible++;
        if (duplicates[key]) {
          duplicateCount++;
          if (!isHidden) duplicateStillVisible++;
        }
      });
    }
    return {
      visible,
      hidden,
      total: visible + hidden,
      duplicates: duplicateCount,
      duplicatesStillVisible: duplicateStillVisible,
    };
  }, [tweets, hiddenIds, duplicates]);

  async function setTag(key: string, next: TagOverrideValue) {
    setTagPending((p) => new Set(p).add(key));
    const prevOverrides = tagOverrides;
    setTagOverrides((prev) => {
      const nextState = { ...prev };
      if (next === "auto") delete nextState[key];
      else nextState[key] = next;
      return nextState;
    });
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key, tag: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { overrides: Record<string, TagValue> };
      setTagOverrides(data.overrides ?? {});
    } catch (err) {
      setTagOverrides(prevOverrides);
      alert(`Failed to save tag: ${(err as Error).message}`);
    } finally {
      setTagPending((p) => {
        const nextSet = new Set(p);
        nextSet.delete(key);
        return nextSet;
      });
    }
  }

  async function hideAllDuplicates() {
    const keys = Object.keys(duplicates).filter((k) => !hiddenIds.has(k));
    if (keys.length === 0) return;
    if (
      !confirm(
        `Hide ${keys.length} detected duplicate${keys.length === 1 ? "" : "s"}? Canonicals stay visible.`
      )
    )
      return;
    setBulkBusy(true);
    setPending((p) => {
      const next = new Set(p);
      keys.forEach((k) => next.add(k));
      return next;
    });
    setHiddenIds((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
    try {
      for (const key of keys) {
        const res = await fetch("/api/hidden", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: key, hidden: true }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} on ${key}`);
      }
      const res = await fetch("/api/hidden", { cache: "no-store" });
      const data = (await res.json()) as { ids: string[] };
      setHiddenIds(new Set(data.ids ?? []));
    } catch (err) {
      alert(`Bulk hide failed: ${(err as Error).message}`);
      try {
        const res = await fetch("/api/hidden", { cache: "no-store" });
        const data = (await res.json()) as { ids: string[] };
        setHiddenIds(new Set(data.ids ?? []));
      } catch {
        // leave optimistic state
      }
    } finally {
      setPending((p) => {
        const next = new Set(p);
        keys.forEach((k) => next.delete(k));
        return next;
      });
      setBulkBusy(false);
    }
  }

  async function toggleHidden(key: string, nextHidden: boolean) {
    setPending((p) => new Set(p).add(key));
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (nextHidden) next.add(key);
      else next.delete(key);
      return next;
    });
    try {
      const res = await fetch("/api/hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key, hidden: nextHidden }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ids: string[] };
      setHiddenIds(new Set(data.ids ?? []));
    } catch (err) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        if (nextHidden) next.delete(key);
        else next.add(key);
        return next;
      });
      alert(`Failed to update: ${(err as Error).message}`);
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <main className="shadcn-scope min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8">
        <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Work Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </span>
              ) : (
                <>
                  {counts.total} media · {counts.visible} visible ·{" "}
                  {counts.hidden} hidden · {counts.duplicates} duplicate
                  {counts.duplicates === 1 ? "" : "s"}
                </>
              )}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/work">
              view /work
              <ArrowUpRight className="ml-1" />
            </Link>
          </Button>
        </header>

        <div className="sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 mb-5 bg-background/85 backdrop-blur border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterTab)}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="visible">
                  Visible
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {counts.visible}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="hidden">
                  Hidden
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {counts.hidden}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="duplicates">
                  Duplicates
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {counts.duplicates}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search caption or tweet ID…"
                className="pl-8"
              />
            </div>

            {counts.duplicatesStillVisible > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={hideAllDuplicates}
                disabled={bulkBusy || loading}
              >
                {bulkBusy ? (
                  <>
                    <Loader2 className="animate-spin" /> Hiding…
                  </>
                ) : (
                  <>
                    Hide {counts.duplicatesStillVisible} duplicate
                    {counts.duplicatesStillVisible === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tile grid — square thumbnails, responsive column count. The whole
            tile is clickable; the dialog holds the details and every control.
            Status (hidden/duplicate/tag-override) is expressed with minimal
            visual markers on the tile itself so the grid reads at a glance. */}
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rows.map((row) => (
            <Tile
              key={row.key}
              row={row}
              onClick={() => setOpenKey(row.key)}
            />
          ))}
        </ul>

        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No media matches.
          </p>
        )}
      </div>

      <Dialog
        open={!!openKey}
        onOpenChange={(v) => {
          if (!v) setOpenKey(null);
        }}
      >
        <DialogContent className="shadcn-scope max-w-2xl">
          {openRow && (
            <DetailPanel
              row={openRow}
              isBusy={pending.has(openRow.key)}
              isTagBusy={tagPending.has(openRow.key)}
              onToggleHidden={() => toggleHidden(openRow.key, !openRow.hidden)}
              onSetTag={(t) => setTag(openRow.key, t)}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ------------------------------------------------------------
// Tile — the at-a-glance grid cell. Status is conveyed by three
// minimal affordances (no badge noise):
//   · hidden     → monochrome + reduced opacity
//   · duplicate  → small violet dot in the top-right
//   · override   → subtle "!" dot in the top-left (manual tag)
// Tag and caption are intentionally absent; the dialog has those.
// ------------------------------------------------------------
function Tile({ row, onClick }: { row: Row; onClick: () => void }) {
  const { media, hidden, duplicateOf, override } = row;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group relative block w-full aspect-square overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition",
          hidden && "opacity-50 grayscale hover:opacity-70"
        )}
      >
        {media.type === "video" || media.type === "animated_gif" ? (
          <video
            src={media.blobUrl}
            className="absolute inset-0 size-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.blobUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        )}

        {/* Hover scrim with just enough gradient to surface the hint. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Hidden overlay — takes over the corner when the tile is excluded. */}
        {hidden && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 text-white px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            <EyeOff className="size-3" />
            hidden
          </div>
        )}

        {/* Tag override indicator — a single dot, only when set. */}
        {override && !hidden && (
          <span
            title={`Tagged "${override}"`}
            className="absolute top-2 left-2 size-2 rounded-full bg-amber-400 ring-2 ring-black/30"
          />
        )}

        {/* Duplicate indicator — top-right dot. */}
        {duplicateOf && (
          <span
            title={
              duplicateOf.kind === "exact"
                ? "Exact duplicate"
                : `Near-duplicate (hamming ${duplicateOf.distance})`
            }
            className={cn(
              "absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm",
              duplicateOf.kind === "exact"
                ? "bg-violet-600/90 text-white"
                : "bg-violet-500/80 text-white"
            )}
          >
            <Copy className="size-2.5" />
          </span>
        )}
      </button>
    </li>
  );
}

// ------------------------------------------------------------
// DetailPanel — everything about ONE media inside the dialog.
// Single pane: preview on top, facts below, actions at the bottom.
// ------------------------------------------------------------
function DetailPanel({
  row,
  isBusy,
  isTagBusy,
  onToggleHidden,
  onSetTag,
}: {
  row: Row;
  isBusy: boolean;
  isTagBusy: boolean;
  onToggleHidden: () => void;
  onSetTag: (t: TagOverrideValue) => void;
}) {
  const {
    tweet,
    media,
    mediaIndex,
    totalMedia,
    hidden,
    duplicateOf,
    heuristic,
    override,
  } = row;
  const canonicalTweetId = duplicateOf?.canonical.split(":")[0];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="font-mono text-sm">{tweet.date}</span>
          <span className="text-muted-foreground text-sm font-normal">
            · media {mediaIndex + 1}/{totalMedia}
          </span>
        </DialogTitle>
        <DialogDescription className="text-xs">
          <a
            href={`https://x.com/laurentdelrey/status/${tweet.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 hover:text-foreground underline underline-offset-2 decoration-muted-foreground/40"
          >
            {tweet.id}
            <ArrowUpRight className="size-3" />
          </a>
        </DialogDescription>
      </DialogHeader>

      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
        {media.type === "video" || media.type === "animated_gif" ? (
          <video
            src={media.blobUrl}
            className="absolute inset-0 size-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.blobUrl}
            alt=""
            className="absolute inset-0 size-full object-contain"
          />
        )}
      </div>

      {/* Status strip — the single place all status lives. */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {hidden ? (
          <Badge variant="default">
            <EyeOff className="mr-1 size-3" />
            hidden
          </Badge>
        ) : (
          <Badge variant="secondary">
            <Eye className="mr-1 size-3" />
            visible
          </Badge>
        )}
        {duplicateOf && canonicalTweetId && (
          <a
            href={`https://x.com/laurentdelrey/status/${canonicalTweetId}`}
            target="_blank"
            rel="noreferrer"
            title="Open the canonical tweet on X"
            className="no-underline"
          >
            <Badge
              variant="secondary"
              className="bg-violet-100 text-violet-900 hover:bg-violet-200 cursor-pointer"
            >
              <Copy className="mr-1 size-3" />
              {duplicateOf.kind === "exact"
                ? "duplicate"
                : `near-dup · ${duplicateOf.distance}`}
              <ArrowUpRight className="ml-0.5 size-3" />
            </Badge>
          </a>
        )}
      </div>

      {tweet.text ? (
        <p className="text-sm leading-snug whitespace-pre-wrap max-h-40 overflow-auto">
          {tweet.text}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground">no caption</p>
      )}

      {/* Actions — two rows, each with an explicit label so nothing is
          inferred from icon alone. */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Visibility</span>
            <span className="text-xs text-muted-foreground">
              Hidden items are excluded from /work.
            </span>
          </div>
          <Button
            variant={hidden ? "default" : "outline"}
            size="sm"
            onClick={onToggleHidden}
            disabled={isBusy}
            className="min-w-24"
          >
            {isBusy ? (
              <Loader2 className="animate-spin" />
            ) : hidden ? (
              <>
                <Eye /> Unhide
              </>
            ) : (
              <>
                <EyeOff /> Hide
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Tag</span>
            <span className="text-xs text-muted-foreground">
              Controls which filter on /work shows this item.
              {override ? (
                <> Manual override — auto would be &ldquo;{heuristic}&rdquo;.</>
              ) : (
                <> Auto: &ldquo;{heuristic}&rdquo; (from media type).</>
              )}
            </span>
          </div>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={override ?? "auto"}
            onValueChange={(v) => {
              if (!v) return;
              onSetTag(v as TagOverrideValue);
            }}
            disabled={isTagBusy}
          >
            <ToggleGroupItem value="auto" className="px-3">
              auto
            </ToggleGroupItem>
            <ToggleGroupItem value="image" className="px-3">
              image
            </ToggleGroupItem>
            <ToggleGroupItem value="prototype" className="px-3">
              prototype
            </ToggleGroupItem>
            <ToggleGroupItem value="both" className="px-3">
              both
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </>
  );
}
