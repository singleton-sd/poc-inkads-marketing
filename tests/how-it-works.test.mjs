import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("how-it-works page uses the shared Claude Design kit", async () => {
  const page = await readFile(
    new URL("src/pages/how-it-works.astro", root),
    "utf8",
  );

  for (const name of [
    "SectionHeading",
    "SystemList",
    "SystemStep",
    "InverseSection",
    "FeatureGrid",
    "FeatureItem",
    "CtaBand",
    "ButtonLink",
  ]) {
    assert.match(page, new RegExp(name));
  }

  assert.match(page, /layout="rows"/);
  assert.match(page, /tone="light"/);
  assert.match(page, /variant="secondary"/);
});

test("how-it-works content covers intro, steps, features, and CTAs", async () => {
  const content = await readFile(
    new URL("src/content/pages/how-it-works.md", root),
    "utf8",
  );

  for (const field of [
    "title",
    "description",
    "headline",
    "summary",
    "eyebrow",
    "featuresEyebrow",
    "featuresHeadline",
    "ctaTitle",
  ]) {
    assert.match(content, new RegExp(`^${field}: .+`, "m"));
  }

  assert.match(content, /title: Match/);
  assert.match(content, /title: Prepare/);
  assert.match(content, /title: Display/);
  assert.match(content, /title: Minimal installation/);
  assert.match(content, /href: \/contact/);
  assert.match(content, /href: \/places/);
  assert.doesNotMatch(
    content,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});
