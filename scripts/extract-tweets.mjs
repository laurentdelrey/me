import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, extname } from "path";

const ARCHIVE_DIR =
  "/Users/laurentdelrey/Downloads/twitter-2026-04-10-c431849a9d0629012f6b2e127223f71184cf27066e3d5c1eed8b4bae20279502/data";
const MEDIA_DIR = join(ARCHIVE_DIR, "tweets_media");
const OUTPUT = join(import.meta.dirname, "..", "src", "data", "tweets.json");

// Parse tweets.js
const raw = readFileSync(join(ARCHIVE_DIR, "tweets.js"), "utf8");
const json = raw.replace("window.YTD.tweets.part0 = ", "");
const allTweets = JSON.parse(json);

// Index local media files by tweet ID
const localFiles = readdirSync(MEDIA_DIR);
const filesByTweetId = new Map();
for (const f of localFiles) {
  const dashIdx = f.indexOf("-");
  if (dashIdx === -1) continue;
  const tweetId = f.substring(0, dashIdx);
  if (!filesByTweetId.has(tweetId)) filesByTweetId.set(tweetId, []);
  filesByTweetId.get(tweetId).push(f);
}

// Filter: original tweets (not replies) with media
const results = [];

for (const { tweet } of allTweets) {
  if (tweet.in_reply_to_status_id_str) continue;
  const media = tweet.extended_entities?.media;
  if (!media?.length) continue;

  // Clean tweet text: remove trailing t.co URLs
  let text = tweet.full_text
    .replace(/https?:\/\/t\.co\/\w+/g, "")
    .trim();

  // Parse date
  const date = new Date(tweet.created_at);
  const dateStr = date.toISOString().split("T")[0];

  // Map media to local files
  const localTweetFiles = filesByTweetId.get(tweet.id_str) || [];
  const mediaItems = [];

  for (const m of media) {
    const isVideo = m.type === "video" || m.type === "animated_gif";

    // For video: find the mp4 local file
    // For photo: find matching jpg/png local file
    let localFile = null;

    if (isVideo) {
      localFile = localTweetFiles.find(
        (f) => extname(f) === ".mp4"
      );
    } else {
      // Match by media URL filename segment
      const urlFilename = m.media_url_https.split("/").pop();
      const baseName = urlFilename.split(".")[0];
      localFile = localTweetFiles.find((f) => f.includes(baseName));
    }

    if (!localFile) continue;

    const item = {
      type: isVideo ? "video" : "photo",
      localFile,
      width: parseInt(m.sizes?.large?.w || m.sizes?.medium?.w || "0"),
      height: parseInt(m.sizes?.large?.h || m.sizes?.medium?.h || "0"),
    };

    if (isVideo && m.video_info) {
      item.durationMs = parseInt(m.video_info.duration_millis || "0");
    }

    mediaItems.push(item);
  }

  if (mediaItems.length === 0) continue;

  results.push({
    id: tweet.id_str,
    date: dateStr,
    text,
    media: mediaItems,
    favoriteCount: parseInt(tweet.favorite_count || "0"),
    retweetCount: parseInt(tweet.retweet_count || "0"),
  });
}

// Collect self-replies (threads) to featured tweets
const resultIds = new Set(results.map((r) => r.id));
const repliesByParent = new Map();

for (const { tweet } of allTweets) {
  if (tweet.in_reply_to_screen_name !== "laurentdelrey") continue;
  const parentId = tweet.in_reply_to_status_id_str;
  if (!parentId || !resultIds.has(parentId)) continue;

  let text = tweet.full_text
    .replace(/^@laurentdelrey\s*/i, "")
    .replace(/https?:\/\/t\.co\/\w+/g, "")
    .trim();
  if (!text) continue;

  if (!repliesByParent.has(parentId)) repliesByParent.set(parentId, []);
  repliesByParent.get(parentId).push(text);
}

// Attach replies to parent tweets
let repliesAttached = 0;
for (const tweet of results) {
  const replies = repliesByParent.get(tweet.id);
  if (replies?.length) {
    tweet.replies = replies;
    repliesAttached += replies.length;
  }
}

// Sort newest first
results.sort((a, b) => b.date.localeCompare(a.date));

writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
console.log(`Extracted ${results.length} tweets with ${results.reduce((s, t) => s + t.media.length, 0)} media items`);
console.log(`Attached ${repliesAttached} self-replies to ${repliesByParent.size} tweets`);
console.log(`Output: ${OUTPUT}`);
