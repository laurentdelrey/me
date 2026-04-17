import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { put } from "@vercel/blob";

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

const MEDIA_DIR =
  "/Users/laurentdelrey/Downloads/twitter-2026-04-10-c431849a9d0629012f6b2e127223f71184cf27066e3d5c1eed8b4bae20279502/data/tweets_media";
const TWEETS_PATH = join(import.meta.dirname, "..", "src", "data", "tweets.json");

const tweets = JSON.parse(readFileSync(TWEETS_PATH, "utf8"));

// Collect all unique media files to upload
const toUpload = [];
for (const tweet of tweets) {
  for (const m of tweet.media) {
    if (!m.blobUrl) {
      toUpload.push({ tweet, media: m });
    }
  }
}

console.log(`Uploading ${toUpload.length} media files to Vercel Blob...`);

const BATCH_SIZE = 10;
let uploaded = 0;
let failed = 0;

for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
  const batch = toUpload.slice(i, i + BATCH_SIZE);

  const results = await Promise.allSettled(
    batch.map(async ({ media }) => {
      const filePath = join(MEDIA_DIR, media.localFile);
      const fileData = readFileSync(filePath);
      const contentType = media.localFile.endsWith(".mp4")
        ? "video/mp4"
        : media.localFile.endsWith(".png")
          ? "image/png"
          : "image/jpeg";

      const blob = await put(`tweets/${media.localFile}`, fileData, {
        access: "public",
        contentType,
        addRandomSuffix: false,
      });

      media.blobUrl = blob.url;
      return blob.url;
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      uploaded++;
    } else {
      failed++;
      console.error("Failed:", r.reason?.message || r.reason);
    }
  }

  // Save progress after each batch
  writeFileSync(TWEETS_PATH, JSON.stringify(tweets, null, 2));
  process.stdout.write(`\r  ${uploaded}/${toUpload.length} uploaded, ${failed} failed`);
}

console.log(`\nDone! ${uploaded} uploaded, ${failed} failed.`);
console.log(`Updated: ${TWEETS_PATH}`);
