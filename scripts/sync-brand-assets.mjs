/**
 * Sync InkAds brand SVGs from poc-inkads-assets (pinned commit via jsDelivr)
 * into `public/brand/` so the static site stays self-contained for Pages + tests.
 *
 * Pin is documented in docs/brand-assets.md — bump SHA when assets main moves.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Pinned poc-inkads-assets commit (do not use @main). */
export const INKADS_ASSETS_COMMIT = "040d0a0d8e34653b780c0e807867c34c77b07e29";

const FILES = [
  ["icon/icon-dark.svg", "icon-dark.svg"],
  ["icon/icon-light.svg", "icon-light.svg"],
];

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(repoRoot, "public", "brand");

async function main() {
  await mkdir(outDir, { recursive: true });
  const base = `https://cdn.jsdelivr.net/gh/singleton-sd/poc-inkads-assets@${INKADS_ASSETS_COMMIT}/svg`;

  for (const [remotePath, localName] of FILES) {
    const url = `${base}/${remotePath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
    }
    const body = await response.text();
    if (!body.includes("<svg")) {
      throw new Error(`Unexpected payload from ${url}`);
    }
    const dest = path.join(outDir, localName);
    await writeFile(dest, body, "utf8");
    console.log(`Synced ${localName} ← ${remotePath}`);
  }
}

export { main };

const isDirectRun =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) ===
    path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
