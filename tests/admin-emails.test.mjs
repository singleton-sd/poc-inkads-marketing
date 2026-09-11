import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertTemplateRevisionFresh,
  STALE_TEMPLATE_MESSAGE,
} from "../admin-emails/src/revision.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const adminEmailsSrc = path.join(root, "admin-emails/src");
const forbiddenSecretPattern =
  /PUBLIC_POSTKIT_API_KEY|VITE_POSTKIT_API_KEY|POSTKIT_API_KEY\s*[=:]|["']POSTKIT_API_KEY["']\s*:/;

async function listFilesRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

test("email admin SPA sources exist and use cms-oauth-kit", async () => {
  const auth = await readFile(path.join(adminEmailsSrc, "auth.ts"), "utf8");
  const app = await readFile(path.join(adminEmailsSrc, "App.tsx"), "utf8");
  const github = await readFile(path.join(adminEmailsSrc, "github.ts"), "utf8");
  const pkg = await readFile(
    path.join(root, "admin-emails/package.json"),
    "utf8",
  );
  const rootPkg = await readFile(path.join(root, "package.json"), "utf8");

  assert.match(auth, /auth\.singletonsd\.com\/auth/);
  assert.match(auth, /authorization:github/);
  assert.match(auth, /event\.source !== popup/);
  assert.match(auth, /new URL\(OAUTH_AUTH_URL\)\.origin/);
  assert.match(auth, /content\/email-templates/);
  assert.match(app, /assets\.inkads\.poc\.singletonsd\.com/);
  assert.match(app, /redirect_uri/);
  assert.match(app, /EmailTemplateEditor/);
  assert.match(app, /onSave/);
  assert.doesNotMatch(app, /onSendTest/);
  assert.match(app, /setTemplate\(null\)/);
  assert.match(app, /setLoadedBlobShas\(null\)/);
  assert.match(app, /setLoadingTemplate\(true\)/);
  assert.match(github, /TEMPLATES_ROOT/);
  assert.match(github, /assertTemplateRevisionFresh/);
  assert.match(github, /expectedBlobShas/);
  assert.match(github, /\/repos\/\$\{GITHUB_REPO\}\/pulls/);
  assert.match(pkg, /@singleton-sd\/post-kit-editor/);
  assert.match(rootPkg, /admin:emails:build/);
  assert.match(rootPkg, /copy-admin-emails\.mjs/);
  assert.match(rootPkg, /check-admin-emails-bundle\.mjs/);
  assert.match(rootPkg, /pnpm admin:emails:build && astro check/);
});

test("email admin sources contain no PostKit API key material", async () => {
  const files = await listFilesRecursive(adminEmailsSrc);
  assert.ok(files.length > 0);
  for (const filePath of files) {
    const relative = path.relative(adminEmailsSrc, filePath);
    const raw = await readFile(filePath, "utf8");
    assert.doesNotMatch(
      raw,
      forbiddenSecretPattern,
      `${relative} must not contain PostKit API key material`,
    );
  }
});

test("stale template blob SHAs are rejected before opening a PR", () => {
  const expected = {
    template: "sha-template-1",
    metadata: "sha-metadata-1",
    preview: "sha-preview-1",
  };
  assert.doesNotThrow(() => assertTemplateRevisionFresh(expected, expected));
  assert.throws(
    () =>
      assertTemplateRevisionFresh(expected, {
        ...expected,
        template: "sha-template-2",
      }),
    (err) => err instanceof Error && err.message === STALE_TEMPLATE_MESSAGE,
  );
});

test("editorial docs describe /admin/emails Decap-parity path", async () => {
  const documentation = await readFile(
    path.join(root, "docs/editorial.md"),
    "utf8",
  );
  assert.match(documentation, /\/admin\/emails/);
  assert.match(documentation, /post-kit-editor/);
  assert.match(documentation, /cms-oauth-kit/);
  assert.match(documentation, /Never put\s+`POSTKIT_API_KEY`/i);
  assert.match(documentation, /redirect_uri is not associated/);
  assert.match(documentation, /#102/);
});

test("email admin index.html carries BaseLayout-parity SEO props", async () => {
  const index = await readFile(
    path.join(root, "admin-emails/index.html"),
    "utf8",
  );
  assert.match(index, /lang="en-AU"/);
  assert.match(index, /name="description"/);
  assert.match(index, /noindex, nofollow/);
  assert.match(index, /theme-color/);
  assert.match(index, /rel="canonical"/);
  assert.match(index, /og:title/);
  assert.match(index, /og:description/);
  assert.match(index, /twitter:card/);
  assert.match(index, /Email templates \| InkAds admin/);
  assert.match(index, /assets\.inkads\.poc\.singletonsd\.com.*icon-dark/);
});

test("built email admin is present after SPA build output exists", async () => {
  const outDir = path.join(root, "admin-emails/dist");
  try {
    await stat(outDir);
  } catch {
    // Build output is gitignored; skip until `pnpm admin:emails:build` has run.
    // `scripts/check-admin-emails-bundle.mjs` enforces both bundle trees during build.
    return;
  }
  const index = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(index, /noindex/);
  assert.match(index, /Email templates \| InkAds admin/);
  assert.match(index, /name="description"/);
  const assets = await readdir(path.join(outDir, "assets")).catch(() => []);
  const bundle = await Promise.all(
    assets
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFile(path.join(outDir, "assets", name), "utf8")),
  );
  for (const source of bundle) {
    assert.doesNotMatch(source, forbiddenSecretPattern);
  }
});
