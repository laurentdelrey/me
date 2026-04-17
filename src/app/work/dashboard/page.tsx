"use client";

import { useEffect, useMemo, useState } from "react";
import tweetsData from "@/data/tweets.json";
import type { Tweet } from "@/types/tweet";

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
        // network error → treat as empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const withStatus = tweets
      .filter((t) => t.media.some((m) => m.blobUrl))
      .map((t) => ({ tweet: t, hidden: hiddenIds.has(t.id) }));

    const q = query.trim().toLowerCase();
    return withStatus
      .filter(({ tweet, hidden }) => {
        if (filter === "visible" && hidden) return false;
        if (filter === "hidden" && !hidden) return false;
        if (!q) return true;
        return tweet.text.toLowerCase().includes(q) || tweet.id.includes(q);
      })
      .sort((a, b) => (a.tweet.date < b.tweet.date ? 1 : -1));
  }, [tweets, hiddenIds, filter, query]);

  const counts = useMemo(() => {
    let visible = 0;
    let hidden = 0;
    for (const t of tweets) {
      if (!t.media.some((m) => m.blobUrl)) continue;
      if (hiddenIds.has(t.id)) hidden++;
      else visible++;
    }
    return { visible, hidden, total: visible + hidden };
  }, [tweets, hiddenIds]);

  async function toggleHidden(id: string, nextHidden: boolean) {
    setPending((p) => new Set(p).add(id));
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (nextHidden) next.add(id);
      else next.delete(id);
      return next;
    });
    try {
      const res = await fetch("/api/hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hidden: nextHidden }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ids: string[] };
      setHiddenIds(new Set(data.ids ?? []));
    } catch (err) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        if (nextHidden) next.delete(id);
        else next.add(id);
        return next;
      });
      alert(`Failed to update: ${(err as Error).message}`);
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);
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
                : `${counts.total} media tweets · ${counts.visible} visible · ${counts.hidden} hidden`}
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
          {rows.map(({ tweet, hidden }) => {
            const firstMedia = tweet.media.find((m) => m.blobUrl);
            const isBusy = pending.has(tweet.id);
            return (
              <li
                key={tweet.id}
                className={`flex gap-4 rounded-2xl border border-neutral-200 bg-white p-3 transition ${
                  hidden ? "opacity-70" : ""
                }`}
              >
                <div className="shrink-0 w-32 h-32 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center">
                  {firstMedia?.blobUrl ? (
                    firstMedia.type === "video" ||
                    firstMedia.type === "animated_gif" ? (
                      <video
                        src={firstMedia.blobUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={firstMedia.blobUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <span className="text-xs text-neutral-400">no media</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{tweet.date}</span>
                    <span>·</span>
                    <span>{tweet.media.length} media</span>
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
                      onClick={() => toggleHidden(tweet.id, !hidden)}
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
            No tweets match.
          </p>
        )}
      </div>
    </main>
  );
}
