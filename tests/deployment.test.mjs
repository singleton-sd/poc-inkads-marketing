import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Astro uses the production custom domain", async () => {
  const config = await readFile(new URL("astro.config.mjs", root), "utf8");
  assert.match(
    config,
    /site:\s*["']https:\/\/inkads\.poc\.singletonsd\.com["']/,
  );
});

test("Pages workflow validates pull requests and deploys main", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/pages.yml", root),
    "utf8",
  );
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.match(workflow, /pages:\s*write/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test("Route 53 documentation names the expected CNAME target", async () => {
  const deployment = await readFile(
    new URL("docs/deployment.md", root),
    "utf8",
  );
  assert.match(deployment, /inkads\.poc\.singletonsd\.com/);
  assert.match(deployment, /singleton-sd\.github\.io/);
});
