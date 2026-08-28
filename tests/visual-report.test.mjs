import assert from "node:assert/strict";
import test from "node:test";
import { buildReportHtml } from "./visual-report-html.mjs";

const sampleEntries = [
  {
    route: "/",
    viewport: "desktop",
    status: "changed",
    prFile: "pr/index-desktop.png",
    baseFile: "base/index-desktop.png",
    diffFile: "diff/index-desktop.png",
    mismatched: 1200,
  },
  {
    route: "/",
    viewport: "mobile",
    status: "unchanged",
    prFile: "pr/index-mobile.png",
    baseFile: "base/index-mobile.png",
    diffFile: null,
    mismatched: 0,
  },
  {
    route: "/pricing",
    viewport: "desktop",
    status: "unchanged",
    prFile: "pr/pricing-desktop.png",
    baseFile: "base/pricing-desktop.png",
    diffFile: null,
    mismatched: 0,
  },
  {
    route: "/pricing",
    viewport: "mobile",
    status: "unchanged",
    prFile: "pr/pricing-mobile.png",
    baseFile: "base/pricing-mobile.png",
    diffFile: null,
    mismatched: 0,
  },
  {
    route: "/venues",
    viewport: "desktop",
    status: "new",
    prFile: "pr/venues-desktop.png",
    baseFile: "base/venues-desktop.png",
    diffFile: "diff/venues-desktop.png",
    mismatched: 500,
  },
];

test("visual report groups routes in accordion details", () => {
  const html = buildReportHtml(sampleEntries, { baseLabel: "main@abc" });
  assert.match(html, /<details class="route-case/);
  assert.equal((html.match(/<details class="route-case/g) ?? []).length, 3);
});

test("visual report expands changed and new routes by default", () => {
  const html = buildReportHtml(sampleEntries, { baseLabel: "main@abc" });
  assert.match(
    html,
    /<details class="route-case route-case--review" open>\s*<summary>\/ ·/,
  );
  assert.match(
    html,
    /<details class="route-case route-case--review" open>\s*<summary>\/venues ·/,
  );
});

test("visual report collapses unchanged routes by default", () => {
  const html = buildReportHtml(sampleEntries, { baseLabel: "main@abc" });
  assert.match(
    html,
    /<details class="route-case route-case--unchanged">\s*<summary>\/pricing · unchanged/,
  );
  assert.doesNotMatch(
    html,
    /<details class="route-case route-case--unchanged" open/,
  );
});

test("visual report includes expand and collapse controls", () => {
  const html = buildReportHtml(sampleEntries, { baseLabel: "main@abc" });
  assert.match(html, /id="expand-all"/);
  assert.match(html, /id="collapse-unchanged"/);
  assert.match(html, /Unchanged routes are collapsed by default/);
});
