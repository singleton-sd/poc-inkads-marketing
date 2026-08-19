import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Decap admin targets this repository and models landing and legal content", async () => {
  const config = await readFile(
    new URL("public/admin/config.yml", root),
    "utf8",
  );

  assert.match(config, /name: github/);
  assert.match(config, /repo: singleton-sd\/poc-inkads-marketing/);
  assert.match(config, /folder: src\/content\/pages/);
  assert.match(config, /folder: src\/content\/legal/);
  assert.match(config, /name: effectiveDate/);
});

test("admin page loads Decap without adding it to the public application", async () => {
  const admin = await readFile(
    new URL("public/admin/index.html", root),
    "utf8",
  );
  const landing = await readFile(
    new URL("src/pages/index.astro", root),
    "utf8",
  );

  assert.match(admin, /decap-cms@3\.15\.1/);
  assert.doesNotMatch(landing, /decap|\/admin/i);
});

test("editorial documentation states the external OAuth requirement", async () => {
  const documentation = await readFile(
    new URL("docs/editorial.md", root),
    "utf8",
  );

  assert.match(documentation, /CMS login is intentionally unavailable/i);
  assert.match(documentation, /GitHub Pages.*cannot execute.*OAuth callback/is);
  assert.match(documentation, /Do not commit OAuth client\s+secrets/i);
});

test("Astro schemas validate landing and future legal frontmatter", async () => {
  const schema = await readFile(new URL("src/content.config.ts", root), "utf8");

  assert.match(schema, /base: "\.\/src\/content\/pages"/);
  assert.match(schema, /base: "\.\/src\/content\/legal"/);
  assert.match(schema, /effectiveDate: z\.coerce\.date\(\)/);
  assert.match(schema, /export const collections = \{ legal, pages \}/);
});
