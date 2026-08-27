import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("FAQ page uses shared kit components and open Q&A", async () => {
  const page = await readFile(new URL("src/pages/faq.astro", root), "utf8");

  assert.match(page, /PageHero/);
  assert.match(page, /FaqItem/);
  assert.match(page, /CtaBand/);
  assert.match(page, /tone="brand"/);
  assert.match(page, /variant="inverse"/);
  assert.match(page, /getCollection\("faqs"\)/);
  assert.match(page, /getEntry\("pages", "faq"\)/);
  assert.doesNotMatch(page, /accordion|details|summary/i);
});

test("FaqItem renders static answers without client script", async () => {
  const component = await readFile(
    new URL("src/components/FaqItem.astro", root),
    "utf8",
  );

  assert.match(component, /faq-item/);
  assert.doesNotMatch(component, /<script/);
  assert.doesNotMatch(component, /client:/);
});
