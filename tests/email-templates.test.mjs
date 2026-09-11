import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const templatesRoot = path.join(root, "content/email-templates");
const requiredFiles = ["template.json", "metadata.json", "preview.json"];

/** Credential names / assignments that must never appear under the template tree. */
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

test("email template directories follow PostKit triple-file layout", async () => {
  const entries = await readdir(templatesRoot, { withFileTypes: true });
  const keys = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(keys, ["demo.welcome", "marketing.waitlist-confirm"]);

  for (const key of keys) {
    const dir = path.join(templatesRoot, key);
    for (const file of requiredFiles) {
      const filePath = path.join(dir, file);
      const info = await stat(filePath);
      assert.ok(info.isFile(), `${key}/${file} must exist`);
      const raw = await readFile(filePath, "utf8");
      assert.doesNotThrow(() => JSON.parse(raw), `${key}/${file} must be JSON`);
    }

    const metadata = JSON.parse(
      await readFile(path.join(dir, "metadata.json"), "utf8"),
    );
    assert.equal(metadata.key, key);
    assert.equal(typeof metadata.name, "string");
    assert.equal(typeof metadata.subject, "string");
    assert.ok(Array.isArray(metadata.variables));
    assert.equal(metadata.schemaVersion, "1");
  }
});

test("email template tree has no PostKit credential material", async () => {
  const files = await listFilesRecursive(templatesRoot);
  assert.ok(files.length > 0, "expected template tree files");

  for (const filePath of files) {
    const relative = path.relative(templatesRoot, filePath);
    const raw = await readFile(filePath, "utf8");
    assert.doesNotMatch(
      raw,
      forbiddenSecretPattern,
      `${relative} must not contain PostKit API key material`,
    );
  }
});

test("editorial docs describe email-templates layout and Decap boundary", async () => {
  const documentation = await readFile(
    path.join(root, "docs/editorial.md"),
    "utf8",
  );

  assert.match(documentation, /content\/email-templates/);
  assert.match(documentation, /template\.json/);
  assert.match(documentation, /metadata\.json/);
  assert.match(documentation, /preview\.json/);
  assert.match(documentation, /Not a Decap collection/i);
  assert.match(documentation, /post-kit-publish/);
  assert.match(documentation, /publish-email-templates\.yml/);
  assert.match(documentation, /templates:compile/);
  assert.match(documentation, /Never commit PostKit API keys/i);
  assert.doesNotMatch(documentation, forbiddenSecretPattern);
});
