import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("design tokens match the approved Singleton SD direction", async () => {
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(styles, /--ink-brand:\s*#ffb300/);
  assert.match(styles, /--ink-brand-hovered:\s*#ffd54f/);
  assert.match(styles, /--ink-canvas:\s*#050505/);
  assert.match(styles, /--ink-radius-control:\s*8px/);
  assert.match(styles, /--ink-radius-card:\s*16px/);
});

test("approved font roles are self-hosted", async () => {
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(layout, /@fontsource-variable\/manrope/);
  assert.match(layout, /@fontsource-variable\/inter/);
  assert.match(layout, /@fontsource\/ibm-plex-mono/);
  assert.match(styles, /--ink-font-heading:.*Manrope/);
  assert.match(styles, /--ink-font-body:.*Inter/);
  assert.match(styles, /--ink-font-label:.*IBM Plex Mono/);
});

test("shell includes skip navigation and non-colour audience labels", async () => {
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const page = await readFile(new URL("src/pages/index.astro", root), "utf8");
  assert.match(layout, /Skip to content/);
  assert.match(page, /For venues/);
  assert.match(page, /For advertisers/);
  assert.match(page, /01 \/ Venues/);
  assert.match(page, /02 \/ Advertisers/);
});

test("motion respects the user reduced-motion preference", async () => {
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});
