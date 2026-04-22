"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

import tweetsData from "@/data/tweets.json";
import duplicatesData from "@/data/duplicates.json";
import type { MediaItem, Tweet } from "@/types/tweet";
import { heuristicTag, type MediaTag } from "@/lib/work/tags";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TagValue = MediaTag;
type TagOverrideValue = TagValue | "auto"; // "auto" = no override, use heuristic

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
  mediaIndex: number; // index among media with blobUrl
  totalMedia: number;
  key: string; // `${tweetId}:${mediaIndex}`
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
        // leave optimistic state as-is
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
    <TooltipProvider delayDuration={200}>
      <main className="shadcn-scope min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8">
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

          {/* Sticky toolbar — filter, search, bulk action all on one row.
              Stays visible while scrolling long lists. */}
          <div className="sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 mb-4 bg-background/80 backdrop-blur border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as FilterTab)}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="visible">
                    Visible
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {counts.visible}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="hidden">
                    Hidden
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {counts.hidden}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="duplicates">
                    Duplicates
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {counts.duplicates}
                    </Badge>
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
                      <Copy />
                      Hide {counts.duplicatesStillVisible} duplicate
                      {counts.duplicatesStillVisible === 1 ? "" : "s"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <ul className="space-y-3">
            {rows.map((row) => (
              <RowCard
                key={row.key}
                row={row}
                isBusy={pending.has(row.key)}
                isTagBusy={tagPending.has(row.key)}
                onToggleHidden={() => toggleHidden(row.key, !row.hidden)}
                onSetTag={(t) => setTag(row.key, t)}
              />
            ))}
          </ul>

          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No media matches.
            </p>
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}

function RowCard({
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
    effective,
  } = row;
  const canonicalTweetId = duplicateOf?.canonical.split(":")[0];

  return (
    <li>
      <Card
        className={hidden ? "opacity-70 transition-opacity" : "transition-opacity"}
      >
        <CardContent className="p-3 flex gap-4">
          <div className="shrink-0 size-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            {media.type === "video" || media.type === "animated_gif" ? (
              <video
                src={media.blobUrl}
                className="size-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.blobUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{tweet.date}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>
                media {mediaIndex + 1}/{totalMedia}
              </span>
              <Separator orientation="vertical" className="h-3" />
              <a
                href={`https://x.com/laurentdelrey/status/${tweet.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 hover:text-foreground underline underline-offset-2 decoration-muted-foreground/40"
              >
                {tweet.id}
                <ArrowUpRight className="size-3" />
              </a>

              <span className="ml-auto flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className={
                        effective === "prototype"
                          ? "bg-sky-100 text-sky-900 hover:bg-sky-100"
                          : effective === "both"
                            ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                            : "bg-neutral-100 text-neutral-800 hover:bg-neutral-100"
                      }
                    >
                      {effective === "prototype" ? (
                        <Zap className="mr-1 size-3" />
                      ) : effective === "both" ? (
                        <Sparkles className="mr-1 size-3" />
                      ) : (
                        <ImageIcon className="mr-1 size-3" />
                      )}
                      {effective}
                      {override && (
                        <span className="ml-1 opacity-60 text-[10px]">•</span>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {override
                      ? `Manually tagged "${override}"`
                      : `Auto-tagged "${heuristic}" (by media type)`}
                  </TooltipContent>
                </Tooltip>

                {duplicateOf && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-violet-100 text-violet-900 hover:bg-violet-100"
                      >
                        <Copy className="mr-1 size-3" />
                        {duplicateOf.kind === "exact" ? "duplicate" : "near-dup"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {duplicateOf.kind === "exact"
                        ? `Byte-identical to ${duplicateOf.canonical}`
                        : `Near-match of ${duplicateOf.canonical} (hamming ${duplicateOf.distance})`}
                    </TooltipContent>
                  </Tooltip>
                )}

                {hidden ? (
                  <Badge>
                    <EyeOff className="mr-1 size-3" />
                    hidden
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                  >
                    <Eye className="mr-1 size-3" />
                    visible
                  </Badge>
                )}
              </span>
            </div>

            {duplicateOf && canonicalTweetId && (
              <p className="text-xs text-violet-700 dark:text-violet-300">
                Duplicate of{" "}
                <a
                  href={`https://x.com/laurentdelrey/status/${canonicalTweetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-violet-900"
                >
                  {duplicateOf.canonical}
                </a>
                {duplicateOf.kind === "near" &&
                  ` · hamming ${duplicateOf.distance}`}
              </p>
            )}

            <p className="text-sm leading-snug whitespace-pre-wrap line-clamp-4">
              {tweet.text || (
                <span className="italic text-muted-foreground">no caption</span>
              )}
            </p>

            <div className="mt-auto flex items-center gap-2 flex-wrap">
              <Button
                variant={hidden ? "default" : "outline"}
                size="sm"
                onClick={onToggleHidden}
                disabled={isBusy}
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

              {/* Tag selector. "Auto" keeps the heuristic ({heuristic}); the
                  other three set an explicit override stored server-side. */}
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={override ?? "auto"}
                onValueChange={(v) => {
                  if (!v) return; // radix emits "" when active item is clicked
                  onSetTag(v as TagOverrideValue);
                }}
                disabled={isTagBusy}
                className="gap-0"
              >
                <ToggleGroupItem value="auto" aria-label="Auto tag">
                  <Wand2 />
                  <span className="hidden sm:inline ml-1">auto</span>
                  <span className="text-muted-foreground text-[10px] ml-1">
                    ({heuristic})
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem value="image" aria-label="Image">
                  <ImageIcon />
                  <span className="hidden sm:inline ml-1">image</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="prototype" aria-label="Prototype">
                  <Zap />
                  <span className="hidden sm:inline ml-1">prototype</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="both" aria-label="Both">
                  <Sparkles />
                  <span className="hidden sm:inline ml-1">both</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
