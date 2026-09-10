import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pagePath = new URL("src/pages/index.astro", root);

test("landing page presents distinct venue and advertiser paths", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /id="venues"/);
  assert.match(page, /id="advertisers"/);
  assert.match(page, /Request a demo/);
  assert.match(page, /See how it works/);
  assert.match(page, /Venue perspective/);
  assert.match(page, /Advertiser perspective/);
  assert.match(page, /accent="audience"/);
});

test("landing page explains the system and intended place contexts", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /id="how-it-works"/);
  assert.match(page, /number="01"[\s\S]*title="Match"/);
  assert.match(page, /number="02"[\s\S]*title="Prepare"/);
  assert.match(page, /number="03"[\s\S]*title="Display"/);

  for (const place of [
    "Bathrooms",
    "Pubs & hospitality",
    "Shopping centres",
    "High-traffic spaces",
  ]) {
    assert.match(page, new RegExp(place.replace("&", "&amp;|&")));
  }
});

test("bathrooms are framed as the initial context rather than the product limit", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /initial proof-of-concept context, not the limit/i);
  assert.match(page, /featured/);
});

test("public landing copy avoids unvalidated outcome claims", async () => {
  const page = await readFile(pagePath, "utf8");
  const home = await readFile(
    new URL("src/content/pages/home.md", root),
    "utf8",
  );
  const publicCopy = `${page}\n${home}`;
  assert.doesNotMatch(
    publicCopy,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});

test("landing page composes Claude Design kit sections and e-paper preview", async () => {
  const page = await readFile(pagePath, "utf8");
  const preview = await readFile(
    new URL("src/components/EpaperPreview.astro", root),
    "utf8",
  );
  assert.match(page, /PageHero/);
  assert.match(page, /EpaperPreview/);
  assert.match(page, /InverseSection/);
  assert.match(page, /CtaBand/);
  assert.match(page, /labelledBy="statement-title"/);
  assert.match(page, /aria-labelledby="system-title"/);
  assert.match(page, /aria-labelledby="places-title"/);
  assert.match(preview, /Preview on display/);
  assert.match(preview, /800 × 480/);
  assert.match(preview, /simulation/);
  assert.match(
    preview,
    /fromRgbaImageData|renderUploadPreview|inkads-epaper-renderer/,
  );
  assert.match(preview, /data-epaper-tab="poster"/);
  assert.match(preview, /data-epaper-tab="advertiser"/);
  assert.match(preview, /data-epaper-tab="yours"/);
  assert.match(preview, /data-epaper-mode/);
});

test("shared e-paper preview module consumes the renderer package", async () => {
  const moduleSource = await readFile(
    new URL("src/lib/epaper-preview.ts", root),
    "utf8",
  );
  assert.match(moduleSource, /@singleton-sd\/inkads-epaper-renderer/);
  assert.match(moduleSource, /fromRgbaImageData/);
  assert.match(moduleSource, /normaliseToProfile/);
  assert.match(moduleSource, /zoom:\s*controls\.zoom/);
  assert.match(moduleSource, /rotation:\s*controls\.rotation/);
  assert.match(moduleSource, /renderMono/);
  assert.match(moduleSource, /packMonoBitmap/);
  assert.match(moduleSource, /toPreviewImage/);
  assert.doesNotMatch(moduleSource, /crop:\s*\{/);
});

test("landing preview UI uses gesture zoom and button pan", async () => {
  const preview = await readFile(
    new URL("src/components/EpaperPreview.astro", root),
    "utf8",
  );
  assert.match(preview, /data-epaper-pan/);
  assert.match(preview, /data-epaper-rotate-image/);
  assert.match(preview, /data-epaper-mount="portrait"/);
  assert.match(preview, /Scroll or pinch to zoom/);
  assert.match(preview, /panFraming/);
  assert.doesNotMatch(preview, /Pan horizontal/);
  assert.doesNotMatch(preview, /data-epaper-crop-x/);
});
