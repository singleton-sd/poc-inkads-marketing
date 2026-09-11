import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function loadQrRedirect() {
  return import(
    pathToFileURL(new URL("src/lib/qr-redirect.ts", root).pathname).href
  );
}

test("QR redirect content defaults to venue contact deep link", async () => {
  const content = await readFile(
    new URL("src/content/redirects/go.md", root),
    "utf8",
  );
  assert.match(content, /^target:\s*\/contact\?role=venue\s*$/m);
});

test("go page is a static content-driven redirect hop", async () => {
  const page = await readFile(new URL("src/pages/go.astro", root), "utf8");
  assert.match(page, /getEntry\("redirects", "go"\)/);
  assert.match(page, /assertSafeQrRedirectTarget/);
  assert.match(page, /http-equiv="refresh"/);
  assert.match(page, /location\.replace/);
  assert.match(page, /noindex,nofollow/);
  assert.doesNotMatch(page, /redirects:\s*\{/);
});

test("QR redirect docs publish the stable HTTPS URL for assets", async () => {
  const editorial = await readFile(new URL("docs/editorial.md", root), "utf8");
  const deployment = await readFile(
    new URL("docs/deployment.md", root),
    "utf8",
  );
  const brand = await readFile(new URL("docs/brand-assets.md", root), "utf8");

  for (const doc of [editorial, deployment, brand]) {
    assert.match(doc, /https:\/\/inkads\.poc\.singletonsd\.com\/go/);
  }
  assert.match(editorial, /src\/content\/redirects\/go\.md/);
  assert.match(editorial, /\/contact\?role=venue/);
  assert.match(deployment, /root-relative allowlisted/);
});

test("QR redirect target validation blocks open redirects", async () => {
  const {
    DEFAULT_QR_REDIRECT_TARGET,
    QR_REDIRECT_PATH,
    assertSafeQrRedirectTarget,
    isSafeQrRedirectTarget,
    normalizeSafeQrRedirectTarget,
  } = await loadQrRedirect();

  assert.equal(QR_REDIRECT_PATH, "/go");
  assert.equal(DEFAULT_QR_REDIRECT_TARGET, "/contact?role=venue");
  assert.equal(
    normalizeSafeQrRedirectTarget("/contact?role=venue"),
    "/contact?role=venue",
  );
  assert.equal(isSafeQrRedirectTarget("/contact"), true);
  assert.equal(isSafeQrRedirectTarget("/venues"), true);
  assert.equal(isSafeQrRedirectTarget("/"), true);

  for (const bad of [
    "https://evil.example/phish",
    "http://evil.example/phish",
    "//evil.example/phish",
    "/\\evil.example",
    "contact",
    "/admin",
    "/not-a-real-route",
    "javascript:alert(1)",
    "",
  ]) {
    assert.equal(isSafeQrRedirectTarget(bad), false, `expected reject: ${bad}`);
  }

  assert.equal(
    assertSafeQrRedirectTarget("  /contact?role=venue  "),
    "/contact?role=venue",
  );
  assert.throws(() => assertSafeQrRedirectTarget("https://evil.example"));
});

test("robots and sitemap exclude the QR redirect utility path", async () => {
  const robots = await readFile(new URL("public/robots.txt", root), "utf8");
  const sitemapScript = await readFile(
    new URL("scripts/generate-sitemap.mjs", root),
    "utf8",
  );
  assert.match(robots, /Disallow:\s*\/go\//);
  assert.match(sitemapScript, /SKIP_ROUTES/);
  assert.match(sitemapScript, /\/go\//);
});

test("Decap Redirects collection points at go.md", async () => {
  const config = await readFile(
    new URL("public/admin/config.yml", root),
    "utf8",
  );
  assert.match(config, /name: redirects/);
  assert.match(config, /file: src\/content\/redirects\/go\.md/);
  assert.match(config, /name: target/);
});

test("content config registers the redirects collection", async () => {
  const schema = await readFile(new URL("src/content.config.ts", root), "utf8");
  assert.match(schema, /base: "\.\/src\/content\/redirects"/);
  assert.match(schema, /redirectEntrySchema/);
  assert.match(schema, /redirects/);
});
