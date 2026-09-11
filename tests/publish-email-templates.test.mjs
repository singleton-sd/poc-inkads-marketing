import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

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
  assert.match(workflow, /azure\/login@v2/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /vars\.AZURE_CLIENT_ID/);
  assert.doesNotMatch(workflow, /AZURE_CREDENTIALS|POSTKIT_API_KEY|account.key|connection.string/i);
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
