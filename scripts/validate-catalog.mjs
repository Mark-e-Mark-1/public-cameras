#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const catalog = JSON.parse(readFileSync(resolve("public/catalog.json"), "utf8"));
const YT = /^[A-Za-z0-9_-]{11}$/;
const HTTPS = /^https:\/\//i;
const categories = new Set(catalog.categories.map((c) => c.id));
const regions = new Set(catalog.regions.map((r) => r.id));
const ids = new Set();
const errors = [];

if (!Array.isArray(catalog.inclusionCriteria) || catalog.inclusionCriteria.length < 3) {
  errors.push("inclusionCriteria must document the security/quality bar");
}

for (const cam of catalog.cameras) {
  const prefix = cam.id || "(missing id)";
  if (!cam.id || ids.has(cam.id)) errors.push(`${prefix}: duplicate or missing id`);
  ids.add(cam.id);
  if (!YT.test(cam.youtubeId || "")) errors.push(`${prefix}: youtubeId must be an 11-char YouTube id`);
  if (cam.embedSrc || cam.iframe || cam.rtsp || cam.ip) {
    errors.push(`${prefix}: raw embed/IP/RTSP fields are not allowed`);
  }
  if (!HTTPS.test(cam.sourceUrl || "")) errors.push(`${prefix}: sourceUrl must be https`);
  if (!categories.has(cam.category)) errors.push(`${prefix}: unknown category`);
  if (!regions.has(cam.region)) errors.push(`${prefix}: unknown region`);
  if (!cam.name || !cam.place || !cam.blurb || !cam.sourceName) {
    errors.push(`${prefix}: missing name/place/blurb/sourceName`);
  }
}

if (catalog.cameras.length < 20 || catalog.cameras.length > 40) {
  errors.push(`expected 20–40 cameras, found ${catalog.cameras.length}`);
}

if (errors.length) {
  console.error("Catalog validation failed:\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`Catalog OK: ${catalog.cameras.length} cameras, YouTube-only HTTPS embeds.`);
