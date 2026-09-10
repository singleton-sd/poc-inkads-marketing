import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { INKADS_ASSETS_COMMIT } from "../scripts/sync-brand-assets.mjs";

const root = new URL("..", import.meta.url);

test("brand sync pins a poc-inkads-assets commit (not @main)", () => {
  assert.match(INKADS_ASSETS_COMMIT, /^[0-9a-f]{40}$/);
});

test("BrandLockup still serves icons from public/brand after sync", async () => {
  const lockup = await readFile(
    new URL("src/components/BrandLockup.astro", root),
    "utf8",
  );
  assert.match(lockup, /brand\/icon-light\.svg/);
  assert.match(lockup, /brand\/icon-dark\.svg/);
});

test("brand assets docs describe the CDN pin workflow", async () => {
  const docs = await readFile(new URL("docs/brand-assets.md", root), "utf8");
  assert.match(docs, /poc-inkads-assets/);
  assert.match(docs, /brand:sync/);
  assert.match(docs, /jsDelivr|cdn\.jsdelivr/);
});

test("build runs brand sync before Astro", async () => {
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.match(pkg.scripts.build, /sync-brand-assets/);
  assert.equal(pkg.scripts["brand:sync"], "node scripts/sync-brand-assets.mjs");
});
