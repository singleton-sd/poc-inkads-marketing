import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pagePath = new URL("src/pages/venues.astro", root);
const contentPath = new URL("src/content/pages/venues.md", root);

test("venues page uses shared Claude Design primitives", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /PageHero/);
  assert.match(page, /MediaPlaceholder/);
  assert.match(page, /InverseSection/);
  assert.match(page, /FeatureGrid/);
  assert.match(page, /ProcessRow/);
  assert.match(page, /CtaBand/);
  assert.match(page, /tone="brand"/);
  assert.match(page, /variant="inverse"/);
});

test("venues content matches the design-reference copy", async () => {
  const content = await readFile(contentPath, "utf8");
  assert.match(content, /Give overlooked space a useful role\./);
  assert.match(content, /01 · For venues/);
  assert.match(content, /Minimal installation/);
  assert.match(content, /Remotely changeable content/);
  assert.match(content, /Clean, quiet display/);
  assert.match(content, /Venue-owned messaging/);
  assert.doesNotMatch(content, /plus revenue/i);
  assert.match(content, /A light footprint for your team\./);
  assert.match(content, /See the venue model in your space\./);
  assert.match(content, /Venue installation photo/);
  assert.doesNotMatch(
    content,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});

test("venues page loads content from the pages collection", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /getEntry\("pages", "venues"\)/);
  assert.match(page, /id="main-content"/);
});
