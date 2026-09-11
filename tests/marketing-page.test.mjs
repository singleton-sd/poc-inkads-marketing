import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("reserved slugs cover fixed src/pages routes", async () => {
  const { isReservedPageSlug } = await import(
    pathToFileURL(new URL("src/lib/reserved-slugs.ts", root).pathname).href
  );
  const pagesDir = new URL("src/pages/", root);
  const files = await readdir(pagesDir);
  const staticSlugs = files
    .filter(
      (name) =>
        name.endsWith(".astro") &&
        name !== "index.astro" &&
        !name.startsWith("["),
    )
    .map((name) => name.replace(/\.astro$/, ""));

  for (const slug of staticSlugs) {
    assert.equal(
      isReservedPageSlug(slug),
      true,
      `expected ${slug} to be reserved`,
    );
  }
});

test("marketing slug helpers reject reserved and invalid values", async () => {
  const { isReservedPageSlug, isValidMarketingSlug } = await import(
    pathToFileURL(new URL("src/lib/reserved-slugs.ts", root).pathname).href
  );

  assert.equal(isReservedPageSlug("about"), true);
  assert.equal(isReservedPageSlug("partners"), false);
  assert.equal(isValidMarketingSlug("pilot-overview"), true);
  assert.equal(isValidMarketingSlug("About"), false);
  assert.equal(isValidMarketingSlug("bad slug"), false);
});

test("dynamic marketing route builds from the marketing collection", async () => {
  const page = await readFile(new URL("src/pages/[slug].astro", root), "utf8");

  assert.match(page, /getCollection\("marketing"/);
  assert.match(page, /getStaticPaths/);
  assert.match(page, /isReservedPageSlug/);
  assert.match(page, /ProseLayout/);
  assert.match(page, /CtaHeavyLayout/);
  assert.match(page, /LandingBandLayout/);
  assert.match(page, /AudienceLandingLayout/);
  assert.match(page, /BaseLayout/);
  assert.doesNotMatch(page, /\bfetch\s*\(|\bXMLHttpRequest\b/);
});

test("marketing schema uses a template discriminatedUnion", async () => {
  const schema = await readFile(
    new URL("src/content/schemas/marketing.ts", root),
    "utf8",
  );

  assert.match(schema, /discriminatedUnion\("template"/);
  assert.match(schema, /z\.literal\("prose"\)/);
  assert.match(schema, /z\.literal\("cta-heavy"\)/);
  assert.match(schema, /z\.literal\("landing-band"\)/);
  assert.match(schema, /z\.literal\("audience-landing"\)/);
  assert.match(schema, /ctaLabel and ctaHref must be provided together/);
});

test("marketing schema accepts each template and rejects cross-template fields", async () => {
  const { marketingPageSchema } = await import(
    pathToFileURL(new URL("src/content/schemas/marketing.ts", root).pathname)
      .href
  );

  const base = {
    title: "T",
    description: "D",
    headline: "H",
    summary: "S",
  };

  assert.equal(
    marketingPageSchema.safeParse({ ...base, template: "prose" }).success,
    true,
  );
  assert.equal(
    marketingPageSchema.safeParse({
      ...base,
      template: "prose",
      ctaLabel: "Go",
    }).success,
    false,
  );
  assert.equal(
    marketingPageSchema.safeParse({
      ...base,
      template: "cta-heavy",
      primaryCta: { label: "Go", href: "/contact" },
      ctaTitle: "Next",
    }).success,
    true,
  );
  assert.equal(
    marketingPageSchema.safeParse({
      ...base,
      template: "landing-band",
      columns: [{ title: "A", body: "B" }],
      statement: "Statement",
      ctaTitle: "Next",
      primaryCta: { label: "Go", href: "/contact" },
      secondaryCta: { label: "FAQ", href: "/faq" },
    }).success,
    true,
  );
  assert.equal(
    marketingPageSchema.safeParse({
      ...base,
      template: "audience-landing",
      ctaLabel: "Go",
      ctaHref: "/contact",
      mediaLabel: "Media",
      benefitsEyebrow: "Benefits",
      benefits: [{ title: "One", description: "Desc" }],
      processEyebrow: "Process",
      processHeadline: "Steps",
      process: [{ label: "Setup", detail: "Detail" }],
      closingHeadline: "Close",
    }).success,
    true,
  );
  assert.equal(
    marketingPageSchema.safeParse({
      ...base,
      template: "prose",
      columns: [{ title: "A", body: "B" }],
    }).success,
    false,
  );
});

test("marketing CMS exposes a template select", async () => {
  const cms = await readFile(
    new URL("src/content/schemas/marketing.cms.ts", root),
    "utf8",
  );

  assert.match(cms, /name: "template"/);
  assert.match(cms, /widget: "select"/);
  assert.match(cms, /default: "prose"/);
  assert.match(cms, /audience-landing/);
  assert.match(cms, /name: "navLabel"/);
  assert.match(cms, /name: "showInHeader"/);
  assert.match(cms, /name: "showInFooter"/);
});

test("layout fixtures cover every marketing template", async () => {
  const fixtures = [
    "layout-prose.md",
    "layout-cta-heavy.md",
    "layout-landing-band.md",
    "layout-audience.md",
  ];

  for (const name of fixtures) {
    const source = await readFile(
      new URL(`src/content/marketing/${name}`, root),
      "utf8",
    );
    assert.match(source, /^template:\s/m);
    assert.match(source, /Layout fixture:/);
    assert.match(source, /draft:\s*false/);
  }
});

test("content config registers the marketing collection", async () => {
  const schema = await readFile(new URL("src/content.config.ts", root), "utf8");

  assert.match(schema, /base: "\.\/src\/content\/marketing"/);
  assert.match(schema, /marketingPageSchema/);
  assert.match(schema, /marketing, pages(?:, redirects)? \}/);
});
