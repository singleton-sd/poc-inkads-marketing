import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pagePath = new URL("src/pages/places.astro", root);
const contentPath = new URL("src/content/pages/places.md", root);

test("places page uses shared chrome primitives from the design kit", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /PageHero/);
  assert.match(page, /PlaceCard/);
  assert.match(page, /InverseSection/);
  assert.match(page, /MediaPlaceholder/);
  assert.match(page, /CtaBand/);
  assert.match(page, /BaseLayout/);
});

test("places content covers bathrooms as the initial focus plus extended contexts", async () => {
  const content = await readFile(contentPath, "utf8");
  assert.match(content, /Start specific\. Think beyond one setting\./);
  assert.match(content, /featured:\s*true/);
  assert.match(content, /Initial focus/);
  for (const place of [
    "Bathrooms",
    "Pubs & hospitality",
    "Shopping centres",
    "High-traffic spaces",
  ]) {
    assert.match(content, new RegExp(place.replace("&", "&amp;|&")));
  }
});

test("places page links the closing CTA to contact", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /withBase\("\/contact"/);
  assert.match(page, /Have a space in mind\?|cta\.title|cta\.label/);
});

test("places public copy avoids unvalidated outcome claims", async () => {
  const page = await readFile(pagePath, "utf8");
  const content = await readFile(contentPath, "utf8");
  const publicCopy = `${page}\n${content}`;
  assert.doesNotMatch(
    publicCopy,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});
