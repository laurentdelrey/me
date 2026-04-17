// One-time migration: move `hidden: true` tweets from tweets.json into the
// dashboard blob (dashboard/hidden.json) and strip the `hidden` field from
// tweets.json so there's only one source of truth.
//
// Usage:   node scripts/migrate-hidden-to-blob.mjs
//          node scripts/migrate-hidden-to-blob.mjs --dry-run

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { put, list } from "@vercel/blob";

// Load .env.local manually (no dotenv dependency)
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

// Collect IDs currently hidden via the JSON field.
const jsonHiddenIds = tweets.filter((t) => t.hidden === true).map((t) => t.id);
console.log(`Found ${jsonHiddenIds.length} tweets with hidden: true in tweets.json`);

// Read any existing blob list so we don't lose dashboard-hidden IDs.
let existing = [];
try {
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
  const match = blobs.find((b) => b.pathname === BLOB_PATH);
  if (match) {
    const res = await fetch(match.url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.ids)) existing = data.ids;
    }
  }
} catch (err) {
  console.warn("Could not read existing blob:", err.message);
}
console.log(`Found ${existing.length} IDs already in the blob`);

const merged = Array.from(new Set([...existing, ...jsonHiddenIds]));
console.log(`Merged total: ${merged.length} unique hidden IDs`);

if (DRY_RUN) {
  console.log("Dry run — not writing anything.");
  process.exit(0);
}

// 1. Write the merged list to the blob.
await put(BLOB_PATH, JSON.stringify({ ids: merged }), {
  access: "public",
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
});
console.log(`Wrote ${merged.length} IDs to blob: ${BLOB_PATH}`);

// 2. Rewrite tweets.json without the `hidden` field.
let stripped = 0;
for (const t of tweets) {
  if ("hidden" in t) {
    delete t.hidden;
    stripped++;
  }
}
writeFileSync(TWEETS_PATH, JSON.stringify(tweets, null, 2));
console.log(`Stripped 'hidden' from ${stripped} tweets in ${TWEETS_PATH}`);
console.log("Done.");
