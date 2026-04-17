// One-time migration: convert the blob from tweet-level IDs ("1234567890") to
// per-media keys ("1234567890:0", "1234567890:1", ...). Existing tweet-level
// IDs are expanded to ALL media indices of that tweet so current hide state
// is preserved.
//
// Usage:  node scripts/migrate-hidden-per-media.mjs [--dry-run]

import { readFileSync } from "fs";
import { join } from "path";
import { put, list } from "@vercel/blob";

// Load .env.local manually
const envFile = readFileSync(join(import.meta.dirname, "..", ".env.local"), "utf8");
for (const line of envFile.split("\n")) {
  if (line.startsWith("#") || !line.includes("=")) continue;
  const eqIdx = line.indexOf("=");
  const key = line.substring(0, eqIdx);
  let val = line.substring(eqIdx + 1);
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
}

const TWEETS_PATH = join(import.meta.dirname, "..", "src", "data", "tweets.json");
const BLOB_PATH = "dashboard/hidden.json";
const DRY_RUN = process.argv.includes("--dry-run");

const tweets = JSON.parse(readFileSync(TWEETS_PATH, "utf8"));
const tweetById = new Map(tweets.map((t) => [t.id, t]));

// Read current blob
const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
const match = blobs.find((b) => b.pathname === BLOB_PATH);
if (!match) {
  console.log("No blob found. Nothing to migrate.");
  process.exit(0);
}
const res = await fetch(match.url, { cache: "no-store" });
const data = await res.json();
const currentIds = Array.isArray(data.ids) ? data.ids : [];
console.log(`Read ${currentIds.length} ids from blob`);

const migrated = new Set();
let expanded = 0;
let kept = 0;

for (const id of currentIds) {
  if (id.includes(":")) {
    // Already per-media, keep as-is
    migrated.add(id);
    kept++;
    continue;
  }
  const tweet = tweetById.get(id);
  if (!tweet) {
    console.warn(`Tweet ${id} not found in tweets.json — dropping`);
    continue;
  }
  // Expand to every media index on that tweet (only ones with blobUrl)
  let mediaIdx = 0;
  for (const m of tweet.media) {
    if (!m.blobUrl) continue;
    migrated.add(`${id}:${mediaIdx}`);
    mediaIdx++;
  }
  expanded++;
}

console.log(
  `Kept ${kept} per-media ids, expanded ${expanded} tweet ids → ${migrated.size} total per-media entries`
);

if (DRY_RUN) {
  console.log("Dry run — not writing.");
  console.log("Preview (first 10):", Array.from(migrated).slice(0, 10));
  process.exit(0);
}

await put(BLOB_PATH, JSON.stringify({ ids: Array.from(migrated) }), {
  access: "public",
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
});
console.log(`Wrote ${migrated.size} entries to ${BLOB_PATH}`);
