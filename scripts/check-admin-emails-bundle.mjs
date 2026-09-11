import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(new URL(".", import.meta.url)));

/** Fail the build if PostKit credential names appear in either admin bundle tree. */
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

async function assertCleanBundle(dir) {
  if (!existsSync(dir)) {
    console.error(`Missing admin email bundle at ${dir}`);
    process.exit(1);
  }
  const files = await listFilesRecursive(dir);
  for (const filePath of files) {
    if (!/\.(js|mjs|cjs|html|map)$/.test(filePath)) continue;
    const raw = await readFile(filePath, "utf8");
    if (forbiddenSecretPattern.test(raw)) {
      console.error(
        `Forbidden PostKit credential material in ${path.relative(rootDir, filePath)}`,
      );
      process.exit(1);
    }
  }
}

await assertCleanBundle(path.join(rootDir, "admin-emails/dist"));
await assertCleanBundle(path.join(rootDir, "dist/admin/emails"));
console.log("Admin email bundles contain no PostKit API key material.");
