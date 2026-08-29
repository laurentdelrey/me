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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
type TagFilterValue = "any" | "image" | "prototype" | "both";

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
  const [tagFilter, setTagFilter] = useState<TagFilterValue>("any");
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
        // Tag filter is an exact match on the EFFECTIVE tag (override >
        // heuristic). "any" passes everything. Matches the mental model of
        // the /work header filter: picking "images" shows exactly what
        // /work?filter=images would show on the live site.
        if (tagFilter !== "any" && r.effective !== tagFilter) return false;
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
  }, [tweets, hiddenIds, tagOverrides, filter, tagFilter, query, duplicates]);

  const counts = useMemo(() => {
    let visible = 0;
    let hidden = 0;
    let duplicateCount = 0;
    let duplicateStillVisible = 0;
    const byTag: Record<TagValue, number> = { image: 0, prototype: 0, both: 0 };
    for (const tweet of tweets) {
      const withBlobs = tweet.media.filter((m) => m.blobUrl);
      withBlobs.forEach((m, i) => {
        const key = `${tweet.id}:${i}`;
        const isHidden = hiddenIds.has(key);
        if (isHidden) hidden++;
        else visible++;
        if (duplicates[key]) {
          duplicateCount++;
          if (!isHidden) duplicateStillVisible++;
        }
        const effective = tagOverrides[key] ?? heuristicTag(m);
        byTag[effective]++;
      });
    }
    return {
      visible,
      hidden,
      total: visible + hidden,
      duplicates: duplicateCount,
      duplicatesStillVisible: duplicateStillVisible,
      byTag,
    };
  }, [tweets, hiddenIds, tagOverrides, duplicates]);

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
    <main className="min-h-screen bg-background text-foreground font-sans antialiased">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Page header — SaaS-standard: title, subtle caption of stats, a
            single secondary action sitting out to the right. No noise. */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Work dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </span>
              ) : (
                <>
                  Manage what appears on{" "}
                  <Link
                    href="/work"
                    className="underline underline-offset-2 decoration-muted-foreground/40 hover:decoration-foreground"
                  >
                    /work
                  </Link>
                  . {counts.total} media · {counts.visible} visible ·{" "}
                  {counts.hidden} hidden · {counts.duplicates} duplicate
                  {counts.duplicates === 1 ? "" : "s"}.
                </>
              )}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/work">
              Preview
              <ArrowUpRight className="ml-1" />
            </Link>
          </Button>
        </header>

        {/* Toolbar — sticky, single row. Filter tabs on the left, search in
            the middle (flex-grows), primary action on the right when there's
            something to do. */}
        <div className="sticky top-0 z-10 -mx-6 px-6 py-3 mb-4 bg-background/90 backdrop-blur border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterTab)}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="visible">
                  Visible
                  <span className="ml-1.5 text-[11px] text-muted-foreground">
                    {counts.visible}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="hidden">
                  Hidden
                  <span className="ml-1.5 text-[11px] text-muted-foreground">
                    {counts.hidden}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="duplicates">
                  Duplicates
                  <span className="ml-1.5 text-[11px] text-muted-foreground">
                    {counts.duplicates}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Tag facet — orthogonal to the visibility tabs above. Picking
                "images" here scopes the list to exactly what would appear at
                /work?filter=images. */}
            <Select
              value={tagFilter}
              onValueChange={(v) => setTagFilter(v as TagFilterValue)}
            >
              <SelectTrigger className="w-[170px] h-9">
                <span className="text-muted-foreground mr-1">Tag:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">any</SelectItem>
                <SelectItem value="image">
                  images ({counts.byTag.image})
                </SelectItem>
                <SelectItem value="prototype">
                  prototypes ({counts.byTag.prototype})
                </SelectItem>
                <SelectItem value="both">
                  both ({counts.byTag.both})
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search caption or tweet ID…"
                className="pl-8 h-9"
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

        {/* Row list. Each row is a flex: [thumb] [caption + meta] [controls].
            A single divider between rows, no rounded cards, no inner borders,
            no badge cluster — this is the "SaaS admin table" look. Status is
            conveyed by the row's opacity (hidden = dimmed) and tiny inline
            chips in the meta line. */}
        <ul className="border-y divide-y">
          {rows.map((row) => (
            <RowItem
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
          <p className="text-sm text-muted-foreground py-12 text-center">
            No media matches.
          </p>
        )}
      </div>
    </main>
  );
}

// ------------------------------------------------------------
// RowItem — one line per media. Three columns:
//   1. Thumbnail         (fixed 72px, square)
//   2. Caption + meta    (flex-grows, truncates)
//   3. Controls          (tag select + hide button)
// Hidden rows keep all controls live but drop to 55% opacity and
// grayscale on the thumbnail so the eye knows "this is excluded".
// ------------------------------------------------------------
function RowItem({
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
  const tweetUrl = `https://x.com/laurentdelrey/status/${tweet.id}`;

  return (
    <li
      className={cn(
        "flex items-start gap-4 py-4 transition-opacity",
        hidden && "opacity-55"
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "relative size-[72px] shrink-0 overflow-hidden rounded-md border bg-muted",
          hidden && "grayscale"
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
      </div>

      {/* Caption + meta */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13.5px] leading-snug line-clamp-2",
            !tweet.text && "italic text-muted-foreground"
          )}
        >
          {tweet.text || "no caption"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
          <span className="font-mono">{tweet.date}</span>
          <Dot />
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 hover:text-foreground underline underline-offset-2 decoration-muted-foreground/40"
          >
            {tweet.id}
            <ArrowUpRight className="size-3" />
          </a>
          {totalMedia > 1 && (
            <>
              <Dot />
              <span>
                media {mediaIndex + 1}/{totalMedia}
              </span>
            </>
          )}
          {duplicateOf && canonicalTweetId && (
            <>
              <Dot />
              <a
                href={`https://x.com/laurentdelrey/status/${canonicalTweetId}`}
                target="_blank"
                rel="noreferrer"
                title="Open the canonical tweet on X"
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-900 px-1.5 py-0.5 font-medium hover:bg-violet-200"
              >
                <Copy className="size-2.5" />
                {duplicateOf.kind === "exact"
                  ? "duplicate"
                  : `near-dup · ${duplicateOf.distance}`}
              </a>
            </>
          )}
          {override && (
            <>
              <Dot />
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-1.5 py-0.5 font-medium">
                override: {override}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <Select
          value={override ?? "auto"}
          onValueChange={(v) => onSetTag(v as TagOverrideValue)}
          disabled={isTagBusy}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">auto ({heuristic})</SelectItem>
            <SelectItem value="image">image</SelectItem>
            <SelectItem value="prototype">prototype</SelectItem>
            <SelectItem value="both">both</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={hidden ? "default" : "outline"}
          size="sm"
          onClick={onToggleHidden}
          disabled={isBusy}
          className="min-w-[90px]"
          title={hidden ? "Show on /work" : "Exclude from /work"}
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
    </li>
  );
}

function Dot() {
  return <span aria-hidden className="text-muted-foreground/50">·</span>;
}
