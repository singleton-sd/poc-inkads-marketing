import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pagePath = new URL("src/pages/pricing.astro", root);
const contentPath = new URL("src/content/pages/pricing.md", root);

test("pricing page uses PageHero, EditorialCards, and InverseSection", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /PageHero/);
  assert.match(page, /EditorialCard/);
  assert.match(page, /InverseSection/);
  assert.match(page, /getEntry\("pages", "pricing"\)/);
});

test("pricing content covers PoC pilots without a published rate card", async () => {
  const content = await readFile(contentPath, "utf8");
  assert.match(content, /^headline: Still in proof-of-concept\./m);
  assert.match(content, /Pilot install/);
  assert.match(content, /Placement pilot/);
  assert.match(content, /no published rate card/i);
  assert.match(content, /accent: brand/);
  assert.match(content, /accent: audience/);
  assert.doesNotMatch(
    content,
    /\b(guaranteed|proven roi|industry-leading|rate card:|\$\d)\b/i,
  );
});

test("pricing pilots link to contact for scoped quotes", async () => {
  const content = await readFile(contentPath, "utf8");
  assert.match(content, /Request pilot pricing/);
  assert.match(content, /Request placement pricing/);
  assert.equal((content.match(/^ {4}href: \/contact$/gm) ?? []).length, 2);
});
