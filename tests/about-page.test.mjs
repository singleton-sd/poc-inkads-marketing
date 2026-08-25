import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const pagePath = new URL("src/pages/about.astro", root);
const contentPath = new URL("src/content/pages/about.md", root);

test("about page uses shared Claude Design section primitives", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /PageHero/);
  assert.match(page, /FeatureGrid/);
  assert.match(page, /FeatureItem/);
  assert.match(page, /InverseSection/);
  assert.match(page, /BrandLockup/);
  assert.match(page, /variant="light"/);
  assert.match(page, /showByline/);
  assert.match(page, /CtaBand/);
});

test("about page content covers PoC constraint, origin, and parent brand", async () => {
  const content = await readFile(contentPath, "utf8");
  assert.match(content, /A proof of concept, built with care/);
  assert.match(content, /The constraint/);
  assert.match(content, /Where it started/);
  assert.match(content, /Singleton SD partners with teams/);
  assert.match(content, /Questions about the project\?/);
  assert.match(content, /label: Contact us/);
  assert.match(content, /href: \/contact/);
  assert.match(content, /label: Read the FAQ/);
  assert.match(content, /href: \/faq/);
});

test("about public copy stays conservative", async () => {
  const page = await readFile(pagePath, "utf8");
  const content = await readFile(contentPath, "utf8");
  const publicCopy = `${page}\n${content}`;
  assert.doesNotMatch(
    publicCopy,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
  assert.match(content, /proof of concept/i);
});
