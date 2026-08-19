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

test("Astro derives preview asset and home links from its base path", async () => {
  const config = await readFile(new URL("astro.config.mjs", root), "utf8");
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const header = await readFile(
    new URL("src/components/SiteHeader.astro", root),
    "utf8",
  );
  assert.match(config, /PREVIEW_BASE_PATH/);
  assert.match(layout, /import\.meta\.env\.BASE_URL/);
  assert.match(header, /import\.meta\.env\.BASE_URL/);
});

test("Pages workflow deploys main without deleting active previews", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/pages.yml", root),
    "utf8",
  );
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /JamesIves\/github-pages-deploy-action@v4\.8\.0/);
  assert.match(workflow, /branch:\s*gh-pages/);
  assert.match(workflow, /clean-exclude:\s*pr-preview/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test("PR workflow publishes subpath previews and updates the PR body", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/preview.yml", root),
    "utf8",
  );
  assert.match(workflow, /rossjrw\/pr-preview-action@v1\.8\.1/);
  assert.match(workflow, /PREVIEW_BASE_PATH:\s*\/pr-preview\/pr-/);
  assert.match(
    workflow,
    /pages-base-url:\s*https:\/\/inkads\.poc\.singletonsd\.com/,
  );
  assert.match(workflow, /pull-requests:\s*write/);
  assert.match(workflow, /github\.rest\.pulls\.update/);
  assert.match(workflow, /inkads-preview:start/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test("Pages branch includes the production custom domain", async () => {
  const cname = await readFile(new URL("public/CNAME", root), "utf8");
  assert.equal(cname.trim(), "inkads.poc.singletonsd.com");
});

test("Route 53 documentation names the expected CNAME target", async () => {
  const deployment = await readFile(
    new URL("docs/deployment.md", root),
    "utf8",
  );
  assert.match(deployment, /inkads\.poc\.singletonsd\.com/);
  assert.match(deployment, /singleton-sd\.github\.io/);
});
