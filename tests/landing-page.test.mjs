import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pagePath = new URL("src/pages/index.astro", root);

test("landing page presents distinct venue and advertiser paths", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /id="venues"/);
  assert.match(page, /For venues — manage a space/);
  assert.match(page, /id="advertisers"/);
  assert.match(page, /For advertisers — place a message/);
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

test("landing page includes semantic section labels and replaceable visuals", async () => {
  const page = await readFile(pagePath, "utf8");
  const device = await readFile(
    new URL("src/components/DeviceFrame.astro", root),
    "utf8",
  );
  assert.match(page, /aria-labelledby="statement-title"/);
  assert.match(page, /aria-labelledby="system-title"/);
  assert.match(page, /aria-labelledby="places-title"/);
  assert.match(device, /replaceable artwork/i);
  assert.match(device, /Product visual placeholder/);
});
