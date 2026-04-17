#!/usr/bin/env node
/**
 * Patch our custom Mapbox style so every layer uses the grey palette we want.
 * Runs locally with a temporary secret token — delete the token after running.
 *
 * Usage:
 *   MAPBOX_SK=sk.xxxxxxxx node scripts/patch-mapbox-style.mjs
 *
 * The colors applied:
 *   background.background-color → #b0b0b0
 *   fill.fill-color              → #b8b8b8
 *   fill.fill-outline-color      → #aaaaaa
 *   line.line-color              → #a0a0a0
 *   symbol.text-color            → #999999
 *   symbol.text-halo-color       → #b8b8b8
 */

const USERNAME = "laurentdelrey";
const STYLE_ID = "cmnw9fue6005v01sv8gb600zg";

const SK = process.env.MAPBOX_SK;
if (!SK || !SK.startsWith("sk.")) {
  console.error("ERROR: set MAPBOX_SK to a Mapbox secret token (starts with 'sk.').");
  console.error("Create one at https://account.mapbox.com/access-tokens with the 'styles:write' scope.");
  process.exit(1);
}

const COLORS = {
  background: { "background-color": "#b0b0b0" },
  fill: { "fill-color": "#b8b8b8", "fill-outline-color": "#aaaaaa" },
  line: { "line-color": "#a0a0a0" },
  symbol: { "text-color": "#999999", "text-halo-color": "#b8b8b8" },
};

const BASE = `https://api.mapbox.com/styles/v1/${USERNAME}/${STYLE_ID}`;

async function main() {
  // 1. Fetch the current style JSON
  console.log("Fetching style…");
  const getRes = await fetch(`${BASE}?access_token=${SK}`);
  if (!getRes.ok) {
    console.error(`GET failed: ${getRes.status} ${await getRes.text()}`);
    process.exit(1);
  }
  const style = await getRes.json();
  console.log(`  name: ${style.name}, layers: ${style.layers.length}`);

  // 2. Rewrite every layer's paint properties to our grey palette
  let touched = 0;
  for (const layer of style.layers) {
    const rules = COLORS[layer.type];
    if (!rules) continue;
    layer.paint = layer.paint ?? {};
    for (const [prop, val] of Object.entries(rules)) {
      layer.paint[prop] = val;
      touched++;
    }
  }
  console.log(`  rewrote ${touched} paint properties across ${style.layers.length} layers`);

  // 3. Override fog — the native style had dark-brown fog colors that tint
  // everything when pitch is > 0. Replace with grey so the horizon blends in.
  if (style.fog) {
    style.fog = {
      ...style.fog,
      color: "#b0b0b0",
      "high-color": "#b0b0b0",
      "space-color": "#b0b0b0",
      "star-intensity": 0,
    };
    console.log("  overrode fog colors to grey");
  }

  // 3. The Styles API's PATCH endpoint expects the whole style payload with a few
  // editable top-level fields — strip the read-only ones the API rejects.
  const payload = { ...style };
  for (const k of ["id", "owner", "created", "modified", "draft", "visibility", "protected"]) {
    delete payload[k];
  }

  console.log("Publishing update…");
  const patchRes = await fetch(`${BASE}?access_token=${SK}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!patchRes.ok) {
    console.error(`PATCH failed: ${patchRes.status} ${await patchRes.text()}`);
    process.exit(1);
  }
  console.log("✅ Style updated. Refresh laurent.fyi/work to see it.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
