#!/usr/bin/env node
// Detect duplicate media across tweets and (optionally) auto-hide all but the
// first (earliest) occurrence.
//
// Two passes:
//   1. SHA-256 content hash → catches byte-identical uploads
//   2. dHash (64-bit perceptual)  → catches the same photo re-uploaded with
//      different compression / crop / resize. Hamming distance ≤ NEAR_THRESHOLD
//      counts as a match. Only runs on still images (photo type).
//
// Canonical pick inside a group: earliest tweet by date, then lowest tweet id,
// then lowest mediaIndex.
//
// Outputs `src/data/duplicates.json` mapping each duplicate key to its canonical.
// With `--apply`, also updates `dashboard/hidden.json` in Vercel Blob to
// auto-hide the duplicates (additive — never un-hides anything).
//
// Usage:
//   node scripts/detect-duplicates.mjs              # dry-run
//   node scripts/detect-duplicates.mjs --apply      # also push to Vercel Blob

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { spawn } from "child_process";
import sharp from "sharp";

// Load .env.local so @vercel/blob works without a separate shell export.
try {
  const envFile = readFileSync(join(import.meta.dirname, "..", ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    if (line.startsWith("#") || !line.includes("=")) continue;
    const eqIdx = line.indexOf("=");
    const key = line.substring(0, eqIdx);
    let val = line.substring(eqIdx + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
} catch {
  // .env.local optional in dry-run
}

const APPLY = process.argv.includes("--apply");
const NEAR_THRESHOLD = 10; // hamming bits out of 64; ≤10 is a confident near-dup

const ROOT = join(import.meta.dirname, "..");
const TWEETS_PATH = join(ROOT, "src", "data", "tweets.json");
const OUT_PATH = join(ROOT, "src", "data", "duplicates.json");
const CACHE_PATH = join(ROOT, "scripts", ".cache", "media-hashes.json");

const tweets = JSON.parse(readFileSync(TWEETS_PATH, "utf8"));

// ---------- cache ----------
mkdirSync(dirname(CACHE_PATH), { recursive: true });
let cache = {};
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    cache = {};
  }
}
function saveCache() {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// ---------- hashing ----------
function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

// dHash: resize to 9x8 grayscale, compare each pixel with its right neighbor.
// Produces a 64-bit signature as a lowercase hex string.
async function dhash(buf) {
  const raw = await sharp(buf)
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = raw[y * 9 + x];
      const right = raw[y * 9 + x + 1];
      bits = (bits << 1n) | (left < right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

// Some network environments block Node's native `fetch` (sandboxes, corporate
// proxies that only trust the system curl). Fall through to a curl subprocess
// when fetch fails — curl binary is available on macOS/Linux by default.
let fetchIsBroken = false;
function curlDownload(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const errs = [];
    const child = spawn("curl", ["-sSL", "--fail", "--max-time", "30", url]);
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => errs.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`curl exit ${code}: ${Buffer.concat(errs).toString().trim()}`));
    });
  });
}
async function downloadBuffer(url) {
  if (!fetchIsBroken) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      // If the very first fetch fails at the socket layer, assume the
      // environment blocks fetch() and stop trying it for subsequent items.
      if (err?.cause?.code === "EPERM" || err?.cause?.code === "ECONNREFUSED") {
        fetchIsBroken = true;
        console.warn("  Node fetch blocked — falling back to curl subprocess.");
      } else {
        throw err;
      }
    }
  }
  return curlDownload(url);
}

function hammingHex(a, b) {
  let d = 0;
  const aBig = BigInt("0x" + a);
  const bBig = BigInt("0x" + b);
  let x = aBig ^ bBig;
  while (x) {
    x &= x - 1n;
    d++;
  }
  return d;
}

// ---------- collect items ----------
const items = [];
for (const tweet of tweets) {
  const withBlobs = tweet.media.filter((m) => m.blobUrl);
  withBlobs.forEach((media, mediaIndex) => {
    items.push({
      key: `${tweet.id}:${mediaIndex}`,
      tweetId: tweet.id,
      date: tweet.date,
      mediaIndex,
      type: media.type,
      blobUrl: media.blobUrl,
    });
  });
}

console.log(`Hashing ${items.length} media items (cache hits skip network)…`);

// ---------- fetch + hash with small concurrency ----------
const CONCURRENCY = 6;
let done = 0;
async function worker(queue) {
  while (queue.length) {
    const it = queue.shift();
    try {
      const cached = cache[it.blobUrl];
      if (cached?.sha && (it.type !== "photo" || cached.dhash)) {
        it.sha = cached.sha;
        it.dhash = cached.dhash ?? null;
      } else {
        const buf = await downloadBuffer(it.blobUrl);
        it.sha = sha256(buf);
        it.dhash = it.type === "photo" ? await dhash(buf).catch(() => null) : null;
        cache[it.blobUrl] = { sha: it.sha, dhash: it.dhash };
      }
    } catch (err) {
      it.error = err.message;
    } finally {
      done++;
      if (done % 20 === 0 || done === items.length) {
        process.stdout.write(`\r  ${done}/${items.length}`);
        saveCache();
      }
    }
  }
}
const queue = items.slice();
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
saveCache();
process.stdout.write("\n");

const errors = items.filter((x) => x.error);
if (errors.length) {
  console.warn(`  ${errors.length} items failed to hash (they won't be grouped)`);
}

// ---------- canonical ordering ----------
function canonicalSort(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.tweetId !== b.tweetId) return a.tweetId < b.tweetId ? -1 : 1;
  return a.mediaIndex - b.mediaIndex;
}

// ---------- exact-dup pass (SHA-256) ----------
const bySha = new Map();
for (const it of items) {
  if (!it.sha) continue;
  if (!bySha.has(it.sha)) bySha.set(it.sha, []);
  bySha.get(it.sha).push(it);
}

const duplicates = {}; // key → { canonical, kind, distance? }
const claimed = new Set(); // items already assigned to a group

for (const group of bySha.values()) {
  if (group.length < 2) continue;
  group.sort(canonicalSort);
  const [canonical, ...dups] = group;
  claimed.add(canonical.key);
  for (const d of dups) {
    duplicates[d.key] = { canonical: canonical.key, kind: "exact" };
    claimed.add(d.key);
  }
}

// ---------- near-dup pass (dHash) on items not already claimed as exact-dups ----------
// Canonical items of exact-dup groups may themselves be near-dups of other groups;
// keep them eligible as canonicals but don't let their exact-dup children match again.
const nearPool = items.filter(
  (it) => it.dhash && !duplicates[it.key] // exclude already-marked duplicates
);
// Compare within a reasonable O(n^2). n≈400 → ~80k comparisons, fine.
nearPool.sort(canonicalSort);
for (let i = 0; i < nearPool.length; i++) {
  const a = nearPool[i];
  if (duplicates[a.key]) continue; // became a dup during this pass
  for (let j = i + 1; j < nearPool.length; j++) {
    const b = nearPool[j];
    if (duplicates[b.key]) continue;
    const d = hammingHex(a.dhash, b.dhash);
    if (d <= NEAR_THRESHOLD) {
      // a is earlier by canonicalSort → canonical
      duplicates[b.key] = { canonical: a.key, kind: "near", distance: d };
    }
  }
}

// ---------- output ----------
const dupKeys = Object.keys(duplicates);
const exactCount = dupKeys.filter((k) => duplicates[k].kind === "exact").length;
const nearCount = dupKeys.length - exactCount;

const payload = {
  generatedAt: new Date().toISOString(),
  thresholdBits: NEAR_THRESHOLD,
  counts: {
    total: items.length,
    duplicates: dupKeys.length,
    exact: exactCount,
    near: nearCount,
  },
  duplicates,
};
writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
console.log(
  `\nFound ${dupKeys.length} duplicates (${exactCount} exact, ${nearCount} near). Wrote ${OUT_PATH}.`
);

// Show a preview of a few groups for manual sanity-check.
const preview = dupKeys.slice(0, 5).map((k) => {
  const d = duplicates[k];
  return `  ${k} ← dup of ${d.canonical} (${d.kind}${d.distance != null ? `, d=${d.distance}` : ""})`;
});
if (preview.length) console.log("Examples:\n" + preview.join("\n"));

// ---------- apply to Vercel Blob hidden.json ----------
if (APPLY) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("\n--apply requires BLOB_READ_WRITE_TOKEN in .env.local");
    process.exit(1);
  }
  const { put, list } = await import("@vercel/blob");
  const HIDDEN_PATH = "dashboard/hidden.json";
  let existingIds = [];
  try {
    const { blobs } = await list({ prefix: HIDDEN_PATH, limit: 1 });
    const match = blobs.find((b) => b.pathname === HIDDEN_PATH);
    if (match) {
      const res = await fetch(match.url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.ids)) existingIds = data.ids;
      }
    }
  } catch (err) {
    console.error("Failed to read existing hidden.json:", err.message);
    process.exit(1);
  }

  const set = new Set(existingIds);
  const added = [];
  for (const k of dupKeys) {
    if (!set.has(k)) {
      set.add(k);
      added.push(k);
    }
  }

  await put(HIDDEN_PATH, JSON.stringify({ ids: Array.from(set) }), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log(
    `Applied to Vercel Blob: +${added.length} newly hidden (was ${existingIds.length}, now ${set.size}).`
  );
}
