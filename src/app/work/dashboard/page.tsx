"use client";

import { useEffect, useMemo, useState } from "react";
import tweetsData from "@/data/tweets.json";
import type { MediaItem, Tweet } from "@/types/tweet";

type Row = {
  tweet: Tweet;
  media: MediaItem;
  mediaIndex: number; // index among media with blobUrl
  totalMedia: number;
  key: string; // `${tweetId}:${mediaIndex}`
  hidden: boolean;
};

export default function DashboardPage() {
  const tweets = tweetsData as Tweet[];
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hidden", { cache: "no-store" });
        const data = (await res.json()) as { ids: string[] };
        if (!cancelled) setHiddenIds(new Set(data.ids ?? []));
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
        all.push({
          tweet,
          media,
          mediaIndex,
          totalMedia: withBlobs.length,
          key,
          hidden: hiddenIds.has(key),
        });
      });
    }

    const q = query.trim().toLowerCase();
    return all
      .filter((r) => {
        if (filter === "visible" && r.hidden) return false;
        if (filter === "hidden" && !r.hidden) return false;
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
  }, [tweets, hiddenIds, filter, query]);

  const counts = useMemo(() => {
    let visible = 0;
    let hidden = 0;
    for (const tweet of tweets) {
      const withBlobs = tweet.media.filter((m) => m.blobUrl);
      withBlobs.forEach((_m, i) => {
        if (hiddenIds.has(`${tweet.id}:${i}`)) hidden++;
        else visible++;
      });
    }
    return { visible, hidden, total: visible + hidden };
  }, [tweets, hiddenIds]);

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
    <main className="min-h-screen bg-neutral-50 text-neutral-900 px-4 sm:px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Work Dashboard
            </h1>
            <p className="text-sm text-neutral-500">
              {loading
                ? "Loading…"
                : `${counts.total} media · ${counts.visible} visible · ${counts.hidden} hidden`}
            </p>
          </div>
          <a
            href="/work"
            className="text-sm text-neutral-500 hover:text-neutral-900 underline underline-offset-2"
          >
            → view /work
          </a>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-white border border-neutral-200 p-0.5 text-sm">
            {(["all", "visible", "hidden"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full transition ${
                  filter === f
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search caption or tweet ID…"
            className="flex-1 min-w-[200px] rounded-full bg-white border border-neutral-200 px-4 py-1.5 text-sm focus:outline-none focus:border-neutral-400"
          />
        </div>

        <ul className="space-y-3">
          {rows.map((row) => {
            const { tweet, media, mediaIndex, totalMedia, key, hidden } = row;
            const isBusy = pending.has(key);
            return (
              <li
                key={key}
                className={`flex gap-4 rounded-2xl border border-neutral-200 bg-white p-3 transition ${
                  hidden ? "opacity-70" : ""
                }`}
              >
                <div className="shrink-0 w-32 h-32 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center">
                  {media.type === "video" || media.type === "animated_gif" ? (
                    <video
                      src={media.blobUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.blobUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{tweet.date}</span>
                    <span>·</span>
                    <span>
                      media {mediaIndex + 1}/{totalMedia}
                    </span>
                    <span>·</span>
                    <a
                      href={`https://x.com/laurentdelrey/status/${tweet.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-neutral-900"
                    >
                      {tweet.id}
                    </a>
                    {hidden ? (
                      <span className="ml-auto rounded-full bg-neutral-900 text-white px-2 py-0.5 text-[10px] font-medium">
                        hidden
                      </span>
                    ) : (
                      <span className="ml-auto rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-medium">
                        visible
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-snug whitespace-pre-wrap line-clamp-4">
                    {tweet.text || (
                      <span className="italic text-neutral-400">no caption</span>
                    )}
                  </p>
                  <div className="mt-auto flex items-center gap-2">
                    <button
                      disabled={isBusy || loading}
                      onClick={() => toggleHidden(key, !hidden)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        hidden
                          ? "bg-neutral-900 text-white hover:bg-neutral-700"
                          : "bg-white border border-neutral-300 hover:border-neutral-500"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isBusy ? "…" : hidden ? "Unhide" : "Hide"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {!loading && rows.length === 0 && (
          <p className="text-sm text-neutral-500 py-8 text-center">
            No media matches.
          </p>
        )}
      </div>
    </main>
  );
}
