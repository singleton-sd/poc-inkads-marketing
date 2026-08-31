import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("reserved slugs cover fixed src/pages routes", async () => {
  const { isReservedPageSlug } = await import(
    pathToFileURL(new URL("src/lib/reserved-slugs.ts", root).pathname).href
  );
  const pagesDir = new URL("src/pages/", root);
  const files = await readdir(pagesDir);
  const staticSlugs = files
    .filter(
      (name) =>
        name.endsWith(".astro") &&
        name !== "index.astro" &&
        !name.startsWith("["),
    )
    .map((name) => name.replace(/\.astro$/, ""));

  for (const slug of staticSlugs) {
    assert.equal(
      isReservedPageSlug(slug),
      true,
      `expected ${slug} to be reserved`,
    );
  }
});

test("marketing slug helpers reject reserved and invalid values", async () => {
  const { isReservedPageSlug, isValidMarketingSlug } = await import(
    pathToFileURL(new URL("src/lib/reserved-slugs.ts", root).pathname).href
  );

  assert.equal(isReservedPageSlug("about"), true);
  assert.equal(isReservedPageSlug("partners"), false);
  assert.equal(isValidMarketingSlug("pilot-overview"), true);
  assert.equal(isValidMarketingSlug("About"), false);
  assert.equal(isValidMarketingSlug("bad slug"), false);
});

test("dynamic marketing route builds from the marketing collection", async () => {
  const page = await readFile(new URL("src/pages/[slug].astro", root), "utf8");

  assert.match(page, /getCollection\("marketing"/);
  assert.match(page, /getStaticPaths/);
  assert.match(page, /isReservedPageSlug/);
  assert.match(page, /PageHero/);
  assert.match(page, /BaseLayout/);
  assert.doesNotMatch(page, /\b(fetch\(|XMLHttpRequest)\b/);
});

test("content config registers the marketing collection", async () => {
  const schema = await readFile(new URL("src/content.config.ts", root), "utf8");

  assert.match(schema, /base: "\.\/src\/content\/marketing"/);
  assert.match(schema, /marketingPageSchema/);
  assert.match(schema, /marketing, pages \}/);
});
