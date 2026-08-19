import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/content/pages/home.md", import.meta.url);

test("home content contains the required public fields", async () => {
  const content = await readFile(homePath, "utf8");
  for (const field of ["title", "description", "headline", "summary"]) {
    assert.match(content, new RegExp(`^${field}: .+`, "m"));
  }
});

test("home content avoids placeholder performance claims", async () => {
  const content = await readFile(homePath, "utf8");
  assert.doesNotMatch(content, /\b(guaranteed|proven roi|industry-leading)\b/i);
});
