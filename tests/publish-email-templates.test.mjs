import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));

async function selectedPublishEnvironment(
  script,
  { inputEnvironment, githubRef },
) {
  const dir = await mkdtemp(join(tmpdir(), "postkit-env-"));
  const githubOutput = join(dir, "github_output");
  await writeFile(githubOutput, "");
  try {
    await execFileAsync("bash", ["-c", script], {
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        INPUT_ENVIRONMENT: inputEnvironment,
        GITHUB_REF: githubRef,
        GITHUB_OUTPUT: githubOutput,
      },
    });
    const output = await readFile(githubOutput, "utf8");
    const name = output.match(/^name=(.*)$/m)?.[1];
    assert.ok(name, `expected name= in GitHub output, got ${output}`);
    return name;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("publish email templates workflow uses OIDC and inkads blob layout", async () => {
  const workflow = await readFile(
    `${root}/.github/workflows/publish-email-templates.yml`,
    "utf8",
  );
  const pkg = await readFile(`${root}/package.json`, "utf8");

  assert.match(workflow, /name: Publish email templates/);
  assert.match(workflow, /pnpm templates:compile/);
  assert.match(workflow, /post-kit-publish/);
  assert.match(workflow, /--tenant inkads/);
  assert.match(workflow, /ssdpostkitstprodae/);
  assert.match(workflow, /--container/);
  assert.match(
    workflow,
    /azure\/login@7184910d9eb2b1c5e48f7073824a90609bb9b6d6 # v2\.3\.1/,
  );
  assert.equal(
    (workflow.match(/persist-credentials:\s*false/g) ?? []).length,
    2,
  );
  assert.match(
    workflow,
    /POSTKIT_ENVIRONMENT:\s*\$\{\{\s*steps\.env\.outputs\.name\s*\}\}/,
  );
  assert.match(workflow, /--environment "\$POSTKIT_ENVIRONMENT"/);
  assert.match(workflow, /--commit "\$GITHUB_SHA"/);
  const selectMatch = workflow.match(
    /name: Select environment\n[\s\S]*?run: \|\n((?: {10}.+\n)+)/,
  );
  assert.ok(selectMatch, "select environment script");
  const selectScript = selectMatch[1].replace(/^ {10}/gm, "");
  assert.equal(
    await selectedPublishEnvironment(selectScript, {
      inputEnvironment: "staging",
      githubRef: "refs/heads/main",
    }),
    "staging",
  );
  assert.equal(
    await selectedPublishEnvironment(selectScript, {
      inputEnvironment: "",
      githubRef: "refs/heads/main",
    }),
    "production",
  );
  assert.equal(
    await selectedPublishEnvironment(selectScript, {
      inputEnvironment: "",
      githubRef: "refs/heads/feature/example",
    }),
    "development",
  );
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /vars\.AZURE_CLIENT_ID/);
  assert.doesNotMatch(
    workflow,
    /AZURE_CREDENTIALS|POSTKIT_API_KEY|account.key|connection.string/i,
  );
  assert.match(pkg, /@singleton-sd\/post-kit-publisher/);
  assert.match(pkg, /templates:compile/);
});

test("deployment docs describe template publish RBAC", async () => {
  const documentation = await readFile(`${root}/docs/deployment.md`, "utf8");
  assert.match(documentation, /publish-email-templates\.yml/);
  assert.match(documentation, /Storage Blob Data\s+Contributor/);
  assert.match(documentation, /tenants\/inkads/);
  assert.match(documentation, /pnpm templates:compile/);
});
