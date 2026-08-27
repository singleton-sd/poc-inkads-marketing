import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("advertisers page uses shared audience primitives and purple accents", async () => {
  const page = await readFile(
    new URL("src/pages/advertisers.astro", root),
    "utf8",
  );

  assert.match(page, /PageHero/);
  assert.match(page, /MediaPlaceholder/);
  assert.match(page, /FeatureGrid/);
  assert.match(page, /FeatureItem/);
  assert.match(page, /CtaBand/);
  assert.match(page, /tone="audience"/);
  assert.match(page, /variant="audience"/);
  assert.match(page, /variant="on-audience"/);
  assert.match(page, /minHeight="340px"/);
  assert.match(page, /getEntry\("pages", "advertisers"\)/);
});

test("advertisers content matches the design-reference copy", async () => {
  const content = await readFile(
    new URL("src/content/pages/advertisers.md", root),
    "utf8",
  );

  assert.match(content, /Place messages in relevant contexts\./);
  assert.match(content, /02 · For advertisers/);
  assert.match(content, /Why advertisers consider InkAds/);
  assert.match(content, /Targeted by venue & location/);
  assert.match(content, /Proof-of-display telemetry/);
  assert.match(content, /Compose for a poster, not a video screen\./);
  assert.match(content, /Explore placement contexts\./);
  assert.doesNotMatch(
    content,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});

test("audience purple remains available on inverse feature bands", async () => {
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(styles, /\.inverse-section \.eyebrow--audience/);
  assert.match(styles, /--ink-audience:\s*#8432ff/);
});
