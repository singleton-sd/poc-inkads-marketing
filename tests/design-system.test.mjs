import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("design tokens match the approved Singleton SD direction", async () => {
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(styles, /--ink-brand:\s*#ffb300/);
  assert.match(styles, /--ink-brand-hovered:\s*#ffd54f/);
  assert.match(styles, /--ink-canvas:\s*#000000/);
  assert.match(styles, /--ink-audience:\s*#8432ff/);
  assert.match(styles, /--ink-brand-on-light:\s*#c89200/);
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
  assert.match(styles, /--ink-font-heading:.*"Manrope"/);
  assert.match(styles, /--ink-font-body:.*"Inter"/);
  assert.match(styles, /--ink-font-label:.*IBM Plex Mono/);
});

test("shell includes skip navigation and non-colour audience labels", async () => {
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const page = await readFile(new URL("src/pages/index.astro", root), "utf8");
  assert.match(layout, /Skip to content/);
  assert.match(page, /Venue perspective/);
  assert.match(page, /Advertiser perspective/);
  assert.match(page, /01 \/ Venues/);
  assert.match(page, /02 \/ Advertisers/);
});

test("motion respects the user reduced-motion preference", async () => {
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test("shared Claude Design kit components are present", async () => {
  const files = await readdir(new URL("src/components", root));
  for (const name of [
    "BrandLockup.astro",
    "SiteHeader.astro",
    "SiteFooter.astro",
    "ButtonLink.astro",
    "TextLink.astro",
    "PageHero.astro",
    "SectionHeading.astro",
    "InverseSection.astro",
    "CtaBand.astro",
    "MediaPlaceholder.astro",
    "EditorialCard.astro",
    "PlaceCard.astro",
    "SystemStep.astro",
    "SystemList.astro",
    "FeatureItem.astro",
    "FeatureGrid.astro",
    "ProcessRow.astro",
    "FaqItem.astro",
    "MetaPair.astro",
    "TextInput.astro",
    "Select.astro",
    "Textarea.astro",
    "ContactForm.astro",
    "EpaperPreview.astro",
  ]) {
    assert.ok(files.includes(name), `missing ${name}`);
  }
});

test("header and footer expose the Claude Design IA", async () => {
  const header = await readFile(
    new URL("src/components/SiteHeader.astro", root),
    "utf8",
  );
  const footer = await readFile(
    new URL("src/components/SiteFooter.astro", root),
    "utf8",
  );
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const { isActivePath, primaryNav, footerNav } = await import(
    pathToFileURL(new URL("src/lib/nav.ts", root).pathname).href
  );

  assert.match(header, /Request a demo/);
  assert.match(header, /aria-current=\{/);
  assert.match(header, /isActivePath\(currentPath, item\.href, base\)/);
  assert.match(layout, /SiteHeader currentPath=\{currentPath\}/);
  assert.match(footer, /aria-label="Footer"/);
  assert.match(footer, /© 2026 InkAds/);

  assert.equal(primaryNav.length, 6);
  assert.deepEqual(
    primaryNav.map((item) => item.href),
    [
      "/how-it-works",
      "/places",
      "/venues",
      "/advertisers",
      "/pricing",
      "/about",
    ],
  );
  assert.deepEqual(Object.keys(footerNav), ["Product", "Audiences", "Company"]);
  assert.ok(
    Object.values(footerNav)
      .flat()
      .some((item) => item.href === "/faq"),
  );
  assert.ok(
    footerNav.Company.some((item) => item.href === "/support"),
    "expected Support in Company footer column",
  );

  assert.equal(isActivePath("/about", "/about", "/"), true);
  assert.equal(isActivePath("/venues", "/about", "/"), false);
  assert.equal(isActivePath("/", "/", "/"), true);
  assert.equal(isActivePath("/about", "/", "/"), false);
  assert.equal(isActivePath("/preview/about", "/about", "/preview/"), true);
  assert.equal(isActivePath("/preview/about", "/", "/preview/"), false);
});
