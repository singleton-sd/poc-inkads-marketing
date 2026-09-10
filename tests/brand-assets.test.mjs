import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  INKADS_ASSETS_CDN,
  brandIconUrl,
  brandLockupHorizontalUrl,
} from "../src/lib/brand-assets.ts";

const root = new URL("..", import.meta.url);

test("brand assets CDN is the Pages host (not jsDelivr)", () => {
  assert.equal(INKADS_ASSETS_CDN, "https://assets.inkads.poc.singletonsd.com");
  assert.doesNotMatch(INKADS_ASSETS_CDN, /jsdelivr/i);
});

test("brandIconUrl points at Pages CDN svg/icon", () => {
  assert.equal(
    brandIconUrl("dark"),
    "https://assets.inkads.poc.singletonsd.com/svg/icon/icon-dark.svg",
  );
});

test("brandLockupHorizontalUrl points at Pages CDN lockup", () => {
  assert.equal(
    brandLockupHorizontalUrl("dark"),
    "https://assets.inkads.poc.singletonsd.com/svg/lockup-horizontal/lockup-horizontal-dark.svg",
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

test("brand assets docs describe Pages CDN consume", async () => {
  const docs = await readFile(new URL("docs/brand-assets.md", root), "utf8");
  assert.match(docs, /poc-inkads-assets/);
  assert.match(docs, /assets\.inkads\.poc\.singletonsd\.com/);
  assert.match(docs, /live/i);
  assert.doesNotMatch(docs, /brand:sync/);
  assert.doesNotMatch(docs, /INKADS_ASSETS_COMMIT/);
});
