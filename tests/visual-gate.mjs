/**
 * Fail CI when visual capture found changed or new routes vs production.
 *
 * Reads `test-results/visual/manifest.json` from `pnpm test:visual`.
 * Set VISUAL_ACCEPTED=1 (or label `visual-accepted` in CI) to pass anyway.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const manifestEnv = process.env.VISUAL_MANIFEST;
const manifestPath = manifestEnv
  ? path.isAbsolute(manifestEnv)
    ? manifestEnv
    : path.join(rootDir, manifestEnv)
  : path.join(rootDir, "test-results/visual/manifest.json");
const accepted =
  process.env.VISUAL_ACCEPTED === "1" || process.env.VISUAL_ACCEPTED === "true";

assert.ok(
  existsSync(manifestPath),
  `Missing visual manifest at ${manifestPath}. Run pnpm test:visual first.`,
);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const summary = manifest.summary ?? {
  total: manifest.routes?.length ?? 0,
  unchanged: 0,
  changed: 0,
  new: 0,
  changedRoutes: [],
  newRoutes: [],
  hasDiffs: false,
};

if (!manifest.summary && Array.isArray(manifest.routes)) {
  const changedRoutes = [
    ...new Set(
      manifest.routes.filter((m) => m.status === "changed").map((m) => m.route),
    ),
  ].sort();
  const newRoutes = [
    ...new Set(
      manifest.routes.filter((m) => m.status === "new").map((m) => m.route),
    ),
  ].sort();
  summary.changed = changedRoutes.length;
  summary.new = newRoutes.length;
  summary.changedRoutes = changedRoutes;
  summary.newRoutes = newRoutes;
  summary.unchanged = manifest.routes.filter(
    (m) => m.status === "unchanged",
  ).length;
  summary.hasDiffs = changedRoutes.length > 0 || newRoutes.length > 0;
}

const lines = [
  `Visual gate: ${summary.total} comparisons`,
  `- unchanged viewports: ${summary.unchanged}`,
  `- changed routes (${summary.changed}): ${summary.changedRoutes.join(", ") || "—"}`,
  `- new routes (${summary.new}): ${summary.newRoutes.join(", ") || "—"}`,
];

for (const line of lines) {
  console.log(line);
}

if (!summary.hasDiffs) {
  console.log("Visual gate passed: no changes vs production.");
  process.exit(0);
}

if (accepted) {
  console.log(
    "Visual gate passed: diffs present but VISUAL_ACCEPTED is set (label visual-accepted).",
  );
  process.exit(0);
}

console.error(
  "Visual gate failed: pixel diffs or new routes vs production. Review the hosted visual report, then add the visual-accepted label (that alone clears the check; no rebuild).",
);
process.exit(1);
