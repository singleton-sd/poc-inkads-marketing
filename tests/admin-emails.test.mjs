import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const adminEmailsSrc = path.join(root, "admin-emails/src");
const forbiddenSecretPattern =
  /PUBLIC_POSTKIT_API_KEY|POSTKIT_API_KEY\s*[=:]|["']POSTKIT_API_KEY["']\s*:/;

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
  assert.match(auth, /content\/email-templates/);
  assert.match(app, /EmailTemplateEditor/);
  assert.match(app, /onSave/);
  assert.doesNotMatch(app, /onSendTest/);
  assert.match(github, /TEMPLATES_ROOT/);
  assert.match(github, /\/repos\/\$\{GITHUB_REPO\}\/pulls/);
  assert.match(pkg, /@singleton-sd\/post-kit-editor/);
  assert.match(rootPkg, /admin:emails:build/);
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

test("editorial docs describe /admin/emails Decap-parity path", async () => {
  const documentation = await readFile(
    path.join(root, "docs/editorial.md"),
    "utf8",
  );
  assert.match(documentation, /\/admin\/emails/);
  assert.match(documentation, /post-kit-editor/);
  assert.match(documentation, /cms-oauth-kit/);
  assert.match(documentation, /Never put\s+`POSTKIT_API_KEY`/i);
  assert.match(documentation, /#102/);
});

test("built email admin is present after public output exists", async () => {
  const outDir = path.join(root, "public/admin/emails");
  try {
    await stat(outDir);
  } catch {
    // Build output is gitignored; skip until `pnpm admin:emails:build` has run.
    return;
  }
  const index = await readFile(path.join(outDir, "index.html"), "utf8");
  assert.match(index, /noindex/);
  assert.match(index, /InkAds email templates/i);
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
