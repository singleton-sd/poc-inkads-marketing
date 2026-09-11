import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(new URL(".", import.meta.url)));

/** Fail the build if PostKit credential names appear in either admin bundle tree. */
export const forbiddenSecretPattern =
  /PUBLIC_POSTKIT_API_KEY|VITE_POSTKIT_API_KEY|POSTKIT_API_KEY\s*[=:]|["']POSTKIT_API_KEY["']\s*:/;

/** Env keys that must never appear as inlined literal values in the SPA bundle. */
export const postkitCredentialEnvKeys = [
  "POSTKIT_API_KEY",
  "VITE_POSTKIT_API_KEY",
  "PUBLIC_POSTKIT_API_KEY",
];

/**
 * Return configured credential values worth scanning for (non-empty strings).
 * Vite can replace `import.meta.env.VITE_*` with these literals at build time.
 */
export function configuredPostkitCredentialValues(env = process.env) {
  const values = [];
  for (const key of postkitCredentialEnvKeys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      values.push({ key, value });
    }
  }
  return values;
}

/** @returns {string | null} Human-readable hit reason, or null if clean. */
export function findForbiddenCredentialMaterial(raw, env = process.env) {
  if (forbiddenSecretPattern.test(raw)) {
    return "credential name or assignment pattern";
  }
  for (const { key, value } of configuredPostkitCredentialValues(env)) {
    if (raw.includes(value)) {
      return `inlined ${key} value`;
    }
  }
  return null;
}

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

async function assertCleanBundle(dir, env = process.env) {
  if (!existsSync(dir)) {
    console.error(`Missing admin email bundle at ${dir}`);
    process.exit(1);
  }
  const files = await listFilesRecursive(dir);
  for (const filePath of files) {
    if (!/\.(js|mjs|cjs|html|map)$/.test(filePath)) continue;
    const raw = await readFile(filePath, "utf8");
    const hit = findForbiddenCredentialMaterial(raw, env);
    if (hit) {
      console.error(
        `Forbidden PostKit credential material (${hit}) in ${path.relative(rootDir, filePath)}`,
      );
      process.exit(1);
    }
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await assertCleanBundle(path.join(rootDir, "admin-emails/dist"));
  await assertCleanBundle(path.join(rootDir, "dist/admin/emails"));
  console.log("Admin email bundles contain no PostKit API key material.");
}
