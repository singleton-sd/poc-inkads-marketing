import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("build script generates sitemap after astro build", async () => {
  const pkg = await readFile(new URL("package.json", root), "utf8");
  assert.match(pkg, /astro build && node scripts\/generate-sitemap\.mjs/);
});

test("sitemap generator script exists", async () => {
  const script = await readFile(
    new URL("scripts/generate-sitemap.mjs", root),
    "utf8",
  );
  assert.match(script, /inkads\.poc\.singletonsd\.com/);
  assert.match(script, /404\.html/);
  assert.match(script, /visual/);
});
