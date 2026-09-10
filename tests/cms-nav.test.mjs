import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("marketing pages default to hidden from nav merge", async () => {
  const { mergeFooterNav, mergePrimaryNav, primaryNav, footerNav } =
    await import(pathToFileURL(new URL("src/lib/nav.ts", root).pathname).href);

  const entries = [
    {
      id: "partners",
      data: { navLabel: "Partners", showInHeader: false, showInFooter: false },
    },
  ];

  assert.deepEqual(mergePrimaryNav(primaryNav, entries), [...primaryNav]);
  assert.deepEqual(mergeFooterNav(footerNav, entries).Company, [
    ...footerNav.Company,
  ]);
});

test("showInHeader appends marketing link after core primary nav", async () => {
  const { mergePrimaryNav, primaryNav } = await import(
    pathToFileURL(new URL("src/lib/nav.ts", root).pathname).href
  );

  const merged = mergePrimaryNav(primaryNav, [
    {
      id: "zeta-pilot",
      data: { navLabel: "Zeta", showInHeader: true },
    },
    {
      id: "alpha-pilot",
      data: { navLabel: "Alpha", showInHeader: true },
    },
  ]);

  assert.equal(merged.length, primaryNav.length + 2);
  assert.deepEqual(
    merged.slice(0, primaryNav.length).map((item) => item.href),
    primaryNav.map((item) => item.href),
  );
  assert.deepEqual(merged.slice(primaryNav.length), [
    { label: "Alpha", href: "/alpha-pilot" },
    { label: "Zeta", href: "/zeta-pilot" },
  ]);
});

test("showInFooter appends to Company column only", async () => {
  const { mergeFooterNav, footerNav } = await import(
    pathToFileURL(new URL("src/lib/nav.ts", root).pathname).href
  );

  const merged = mergeFooterNav(footerNav, [
    {
      id: "partners",
      data: { navLabel: "Partners", showInFooter: true },
    },
  ]);

  assert.deepEqual(
    merged.Product.map((item) => item.href),
    footerNav.Product.map((item) => item.href),
  );
  assert.ok(merged.Company.some((item) => item.href === "/partners"));
  assert.ok(merged.Company.some((item) => item.href === "/support"));
});

test("nav merge skips draft entries and missing navLabel", async () => {
  const { mergePrimaryNav, primaryNav } = await import(
    pathToFileURL(new URL("src/lib/nav.ts", root).pathname).href
  );

  const merged = mergePrimaryNav(primaryNav, [
    { id: "drafty", data: { showInHeader: true, navLabel: "X", draft: true } },
    { id: "nolabel", data: { showInHeader: true } },
  ]);

  assert.deepEqual(merged, [...primaryNav]);
});

test("approved routes include discovered marketing URLs", async () => {
  const { approvedInternalRoutes } = await import(
    pathToFileURL(new URL("src/lib/approved-internal-routes.ts", root).pathname)
      .href
  );
  const { discoverMarketingInternalRoutes } = await import(
    pathToFileURL(new URL("src/lib/marketing-routes.ts", root).pathname).href
  );

  const discovered = discoverMarketingInternalRoutes();
  assert.ok(discovered.includes("/layout-prose"));
  assert.ok(discovered.includes("/layout-audience"));
  for (const href of discovered) {
    assert.ok(
      approvedInternalRoutes.includes(href),
      `expected ${href} in approvedInternalRoutes`,
    );
  }
});

test("reserved marketing slugs are not discovered as routes", async () => {
  const { isReservedPageSlug } = await import(
    pathToFileURL(new URL("src/lib/reserved-slugs.ts", root).pathname).href
  );
  const { discoverMarketingInternalRoutes } = await import(
    pathToFileURL(new URL("src/lib/marketing-routes.ts", root).pathname).href
  );

  for (const href of discoverMarketingInternalRoutes()) {
    const slug = href.slice(1);
    assert.equal(isReservedPageSlug(slug), false);
  }
});

test("marketing schema requires navLabel when nav opt-in is enabled", async () => {
  const { marketingPageSchema } = await import(
    pathToFileURL(new URL("src/content/schemas/marketing.ts", root).pathname)
      .href
  );

  const base = {
    title: "T",
    description: "D",
    headline: "H",
    summary: "S",
    template: "prose",
  };

  assert.equal(
    marketingPageSchema.safeParse({ ...base, showInHeader: true }).success,
    false,
  );
  assert.equal(
    marketingPageSchema.safeParse({
      ...base,
      showInHeader: true,
      navLabel: "Partners",
    }).success,
    true,
  );
  assert.equal(
    marketingPageSchema.safeParse({
      ...base,
      showInFooter: true,
      navLabel: "Partners",
    }).success,
    true,
  );
});
