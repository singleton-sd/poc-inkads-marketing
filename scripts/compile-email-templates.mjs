#!/usr/bin/env node
/**
 * Compile every PostKit template under content/email-templates without uploading.
 * Used locally and on PRs so compile failures fail CI before Azure publish.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileFromDirectory } from "@singleton-sd/post-kit-compiler";

const rootDir = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
const templatesDir = path.join(rootDir, "content/email-templates");

const entries = await readdir(templatesDir, { withFileTypes: true });
const dirs = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (dirs.length === 0) {
  console.error(`No template directories under ${templatesDir}`);
  process.exit(1);
}

let failed = 0;
for (const name of dirs) {
  const dir = path.join(templatesDir, name);
  try {
    const compiled = await compileFromDirectory(dir, {
      sourceCommit: process.env.GITHUB_SHA,
    });
    console.log(
      `compiled ${compiled.metadata.key} hash=${compiled.manifest.contentHash}`,
    );
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`compile failed for ${name}: ${message}`);
  }
}

if (failed > 0) {
  console.error(`Failed to compile ${failed} template(s).`);
  process.exit(1);
}

console.log(`Compiled ${dirs.length} template(s).`);
