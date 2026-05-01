import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { writeFile as writeFileAsync } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import { put } from "@vercel/blob";
import sharp from "sharp";

// Loads BLOB_READ_WRITE_TOKEN the same way upload-blobs.mjs does.
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
const tweets = JSON.parse(readFileSync(TWEETS_PATH, "utf8"));

// 200px wide covers desktop's 100px thumb on 2x retina. Quality 70 keeps
// each thumbnail in the 5-15 KB range — small enough that the filmstrip
// downloads the entire ribbon faster than a single original photo.
const THUMB_WIDTH = 200;
const JPEG_QUALITY = 70;

// Build the work list: anything missing the appropriate pre-generated URL.
const work = [];
for (const tweet of tweets) {
  for (const m of tweet.media) {
    if (!m.blobUrl) continue;
    if (m.type === "photo" && !m.thumbBlobUrl) {
      work.push({ tweet, media: m, kind: "photo" });
    } else if ((m.type === "video" || m.type === "animated_gif") && !m.posterBlobUrl) {
      work.push({ tweet, media: m, kind: "video" });
    }
  }
}

console.log(`Generating ${work.length} thumbnails...`);
if (work.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

async function generatePhotoThumb(blobUrl) {
  const res = await fetch(blobUrl);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${blobUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return sharp(buf)
    .rotate() // honor EXIF orientation before resizing
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

// Download the MP4 to a tempfile first, then ffmpeg from disk. We can't
// stream straight from the URL because ffmpeg doesn't use Node's proxy
// configuration, while fetch does.
async function generateVideoPoster(blobUrl) {
  const tmpDir = mkdtempSync(join(tmpdir(), "poster-"));
  const tmpVideo = join(tmpDir, "in.mp4");
  const tmpFrame = join(tmpDir, "frame.jpg");
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${blobUrl}`);
    await writeFileAsync(tmpVideo, Buffer.from(await res.arrayBuffer()));

    await new Promise((resolve, reject) => {
      const args = [
        "-y",
        "-loglevel", "error",
        "-ss", "0.1",
        "-i", tmpVideo,
        "-frames:v", "1",
        "-q:v", "3",
        tmpFrame,
      ];
      const proc = spawn("ffmpeg", args);
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exit ${code}: ${stderr}`));
      });
    });
    const buf = readFileSync(tmpFrame);
    return await sharp(buf)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function thumbKey(media, kind) {
  // Mirror the upload-blobs.mjs naming scheme so files sit next to their
  // originals in the same blob namespace.
  const base = media.localFile.replace(/\.[^.]+$/, "");
  const suffix = kind === "photo" ? "thumb" : "poster";
  return `tweets/thumbs/${base}-${suffix}.jpg`;
}

const BATCH_SIZE = 5;
let done = 0;
let failed = 0;

for (let i = 0; i < work.length; i += BATCH_SIZE) {
  const batch = work.slice(i, i + BATCH_SIZE);
  const results = await Promise.allSettled(
    batch.map(async ({ media, kind }) => {
      const buf =
        kind === "photo"
          ? await generatePhotoThumb(media.blobUrl)
          : await generateVideoPoster(media.blobUrl);
      const blob = await put(thumbKey(media, kind), buf, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
      });
      if (kind === "photo") media.thumbBlobUrl = blob.url;
      else media.posterBlobUrl = blob.url;
      return { kind, url: blob.url, bytes: buf.length };
    }),
  );

  for (let j = 0; j < results.length; j++) {
    const r = results[j];
    if (r.status === "fulfilled") {
      done++;
    } else {
      failed++;
      const item = batch[j];
      console.error(`\nFailed (${item.kind} ${item.media.localFile}):`, r.reason?.message || r.reason);
    }
  }

  // Persist after every batch so a mid-run crash never loses progress.
  writeFileSync(TWEETS_PATH, JSON.stringify(tweets, null, 2));
  process.stdout.write(`\r  ${done}/${work.length} done, ${failed} failed   `);
}

console.log(`\nDone. ${done} generated, ${failed} failed.`);
