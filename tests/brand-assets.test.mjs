import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { INKADS_ASSETS_COMMIT, brandIconUrl } from "../src/lib/brand-assets.ts";

const root = new URL("..", import.meta.url);

test("brand assets pin a poc-inkads-assets commit (not @main)", () => {
  assert.match(INKADS_ASSETS_COMMIT, /^[0-9a-f]{40}$/);
});

test("brandIconUrl points at pinned jsDelivr CDN", () => {
  const url = brandIconUrl("dark");
  assert.match(
    url,
    new RegExp(
      `cdn\\.jsdelivr\\.net/gh/singleton-sd/poc-inkads-assets@${INKADS_ASSETS_COMMIT}/svg/icon/icon-dark\\.svg`,
    ),
  );
});

test("BrandLockup loads icons from brandIconUrl (CDN)", async () => {
  const lockup = await readFile(
    new URL("src/components/BrandLockup.astro", root),
    "utf8",
  );
  assert.match(lockup, /brandIconUrl/);
  assert.doesNotMatch(lockup, /brand\/icon-/);
});

test("public/brand icon copies are not vendored", () => {
  const brandDir = fileURLToPath(new URL("public/brand", root));
  assert.equal(existsSync(brandDir), false);
});

test("brand assets docs describe live CDN consume", async () => {
  const docs = await readFile(new URL("docs/brand-assets.md", root), "utf8");
  assert.match(docs, /poc-inkads-assets/);
  assert.match(docs, /jsDelivr|cdn\.jsdelivr/);
  assert.match(docs, /live/i);
  assert.doesNotMatch(docs, /brand:sync/);
});
