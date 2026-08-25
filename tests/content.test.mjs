import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/content/pages/home.md", import.meta.url);
const faqPagePath = new URL("../src/content/pages/faq.md", import.meta.url);
const faqsDir = new URL("../src/content/faqs/", import.meta.url);

test("home content contains the required public fields", async () => {
  const content = await readFile(homePath, "utf8");
  for (const field of ["title", "description", "headline", "summary"]) {
    assert.match(content, new RegExp(`^${field}: .+`, "m"));
  }
});

test("home content avoids placeholder performance claims", async () => {
  const content = await readFile(homePath, "utf8");
  assert.doesNotMatch(content, /\b(guaranteed|proven roi|industry-leading)\b/i);
});

test("FAQ page content contains the required public fields", async () => {
  const content = await readFile(faqPagePath, "utf8");
  for (const field of [
    "title",
    "description",
    "headline",
    "summary",
    "eyebrow",
    "ctaTitle",
    "ctaLabel",
    "ctaHref",
  ]) {
    assert.match(content, new RegExp(`^${field}: .+`, "m"));
  }
});

test("FAQ items cover the design-reference questions", async () => {
  const files = (await readdir(faqsDir)).filter((name) => name.endsWith(".md"));
  assert.equal(files.length, 6);

  const contents = await Promise.all(
    files.map((name) => readFile(new URL(name, faqsDir), "utf8")),
  );
  const joined = contents.join("\n");

  for (const question of [
    "Is InkAds trying to replace video digital signage?",
    "Do displays need mains power or a network cable?",
    "How does content get updated?",
    "Where is InkAds being tested first?",
    "Can I track whether my creative was actually displayed?",
    "What does it cost?",
  ]) {
    assert.match(joined, new RegExp(question.replace(/[?]/g, "\\$&")));
  }

  assert.doesNotMatch(joined, /\b(guaranteed|proven roi|industry-leading)\b/i);
});
