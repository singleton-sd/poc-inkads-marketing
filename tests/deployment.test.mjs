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
  assert.match(workflow, /sticky-pull-request-comment@v2/);
  assert.match(workflow, /header:\s*inkads-preview/);
  assert.match(workflow, /pnpm test:visual/);
  assert.match(workflow, /visual-pr-\$\{\{\s*github\.event\.number\s*\}\}/);
  assert.match(workflow, /dist\/visual/);
  assert.match(workflow, /name:\s*visual/);
  assert.match(workflow, /visual-gate\.mjs/);
  assert.match(workflow, /visual-accepted/);
  assert.match(workflow, /\blabeled\b/);
  assert.match(workflow, /\bunlabeled\b/);
  assert.match(
    workflow,
    /format\('visual-label-pr-\{0\}',\s*github\.event\.number\)/,
  );
  assert.match(
    workflow,
    /format\('preview-pr-\{0\}',\s*github\.event\.number\)/,
  );
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.equal(
    (workflow.match(/Wandalen\/wretry\.action@v3\.8\.0/g) ?? []).length,
    2,
  );
  assert.equal((workflow.match(/attempt_limit:\s*6/g) ?? []).length, 2);
  assert.equal((workflow.match(/attempt_delay:\s*20000/g) ?? []).length, 2);
  assert.doesNotMatch(workflow, /\|\|\s*'pages-publish'/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test("visual screenshot helper is wired for hosted report and gate", async () => {
  const pkg = await readFile(new URL("package.json", root), "utf8");
  const visual = await readFile(new URL("tests/visual.mjs", root), "utf8");
  const gate = await readFile(new URL("tests/visual-gate.mjs", root), "utf8");
  const template = await readFile(
    new URL(".github/pull_request_template.md", root),
    "utf8",
  );
  const deployment = await readFile(
    new URL("docs/deployment.md", root),
    "utf8",
  );
  assert.match(pkg, /"test:visual":\s*"node tests\/visual\.mjs"/);
  assert.match(pkg, /"test:visual:gate":\s*"node tests\/visual-gate\.mjs"/);
  assert.match(pkg, /"pixelmatch"/);
  assert.match(visual, /test-results\/visual/);
  assert.match(visual, /VISUAL_BASE_URL/);
  assert.match(visual, /index\.html/);
  assert.match(visual, /entry\.name === "visual"/);
  assert.match(visual, /1440/);
  assert.match(visual, /390/);
  assert.match(gate, /VISUAL_ACCEPTED/);
  assert.match(gate, /hasDiffs/);
  assert.match(template, /inkads-preview:start/);
  assert.match(template, /## Preview/);
  assert.match(template, /visual-accepted/);
  assert.match(deployment, /Open visual report/);
  assert.match(deployment, /required.*visual/i);
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
