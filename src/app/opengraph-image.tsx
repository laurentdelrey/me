import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "laurent del rey - internet designer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card: the wordmark in the site's own type on the cloud grey.
export default async function Image() {
  const haas = await readFile(
    join(process.cwd(), "public/fonts/NeueHaasDisplayRoman.ttf")
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#bfbfbf",
          fontFamily: "Neue Haas",
        }}
      >
        <div style={{ fontSize: 112, color: "#ffffff", letterSpacing: "-0.01em" }}>
          laurent del rey
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Neue Haas", data: haas, weight: 400, style: "normal" }] }
  );
}
