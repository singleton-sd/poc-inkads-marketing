import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("support content includes SEO and hero fields", async () => {
  const content = await readFile(
    new URL("src/content/pages/support.md", root),
    "utf8",
  );
  for (const field of ["title", "description", "headline", "summary"]) {
    assert.match(content, new RegExp(`^${field}: .+`, "m"));
  }
  assert.match(content, /Support \| InkAds/);
  assert.doesNotMatch(
    content,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});

test("support page reuses the site shell and contact paths", async () => {
  const page = await readFile(new URL("src/pages/support.astro", root), "utf8");
  assert.match(page, /BaseLayout/);
  assert.match(page, /PageHero/);
  assert.match(page, /getEntry\("pages", "support"\)/);
  assert.match(page, /mailto:\$\{supportEmail\}/);
  assert.match(page, /hello@inkads\.poc\.singletonsd\.com/);
  assert.match(page, /withBase\("\/contact"/);
  assert.doesNotMatch(page, /\b(webhook|fetch\(|XMLHttpRequest)\b/);
});

test("footer Company column links to Support", async () => {
  const { footerNav } = await import(
    pathToFileURL(new URL("src/lib/nav.ts", root).pathname).href
  );
  assert.ok(
    footerNav.Company.some((item) => item.href === "/support"),
    "expected Support in Company footer column",
  );
});
