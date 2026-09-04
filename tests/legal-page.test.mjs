import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("privacy and terms pages load legal collection entries", async () => {
  const privacy = await readFile(
    new URL("src/pages/privacy.astro", root),
    "utf8",
  );
  const terms = await readFile(new URL("src/pages/terms.astro", root), "utf8");
  const layout = await readFile(
    new URL("src/layouts/LegalLayout.astro", root),
    "utf8",
  );

  assert.match(privacy, /getEntry\("legal", "privacy"\)/);
  assert.match(terms, /getEntry\("legal", "terms"\)/);
  assert.match(privacy, /LegalLayout/);
  assert.match(terms, /LegalLayout/);
  assert.match(privacy, /formatLegalEffectiveDate/);
  assert.match(terms, /formatLegalEffectiveDate/);
  assert.match(layout, /legal-section/);
  assert.match(privacy, /page\.data\.draft/);
  assert.match(terms, /page\.data\.draft/);
});

test("privacy policy matches preview-only contact behaviour", async () => {
  const privacy = await readFile(
    new URL("src/content/legal/privacy.md", root),
    "utf8",
  );

  assert.match(privacy, /preview only/i);
  assert.doesNotMatch(privacy, /PostKit|rate limiting/i);
});

test("legal content files are published", async () => {
  for (const slug of ["privacy", "terms"]) {
    const content = await readFile(
      new URL(`src/content/legal/${slug}.md`, root),
      "utf8",
    );
    assert.match(content, /^title: .+/m);
    assert.match(content, /^description: .+/m);
    assert.match(content, /^effectiveDate: /m);
    assert.match(content, /^draft: false\s*$/m);
  }
});

test("footer links to Privacy and Terms", async () => {
  const footer = await readFile(
    new URL("src/components/SiteFooter.astro", root),
    "utf8",
  );

  assert.match(footer, /withBase\("\/privacy"/);
  assert.match(footer, /withBase\("\/terms"/);
});

test("privacy and terms slugs are reserved from marketing pages", async () => {
  const reserved = await readFile(
    new URL("src/lib/reserved-slugs.ts", root),
    "utf8",
  );

  assert.match(reserved, /"privacy"/);
  assert.match(reserved, /"terms"/);
});
