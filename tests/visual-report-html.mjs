/**
 * HTML report for `pnpm test:visual` — grouped by route with accordions.
 */

/** @typedef {{
 *   route: string;
 *   viewport: string;
 *   status: string;
 *   prFile: string;
 *   baseFile: string | null;
 *   diffFile: string | null;
 *   mismatched: number;
 * }} VisualManifestEntry */

function routeNeedsReview(entries) {
  return entries.some(
    (entry) =>
      entry.status === "new" ||
      entry.status === "changed" ||
      entry.mismatched > 0,
  );
}

function formatRouteSummary(route, entries, needsReview) {
  const viewports = entries.map((entry) => entry.viewport).join(" + ");
  if (!needsReview) {
    return `${route} · unchanged (${viewports})`;
  }
  if (entries.some((entry) => entry.status === "new")) {
    return `${route} · <span class="changed">new route</span> (${viewports})`;
  }
  const maxPx = Math.max(...entries.map((entry) => entry.mismatched || 0));
  return `${route} · <span class="changed">${maxPx} px changed</span> (${viewports})`;
}

function buildViewportCaseHtml(entry) {
  const baseCaption =
    entry.status === "new" && entry.baseFile
      ? "Base (before — route missing / 404)"
      : "Base (before)";
  const baseCell = entry.baseFile
    ? `<img src="${entry.baseFile}" alt="base ${entry.route} ${entry.viewport}" />`
    : `<p class="missing">No base (could not capture baseline)</p>`;
  const diffCell = entry.diffFile
    ? `<img src="${entry.diffFile}" alt="diff ${entry.route} ${entry.viewport}" />`
    : entry.baseFile
      ? `<p class="ok">No pixel diff</p>`
      : `<p class="missing">—</p>`;
  const statusLabel =
    entry.status === "new"
      ? ` · <span class="changed">new route</span>`
      : entry.mismatched
        ? ` · <span class="changed">${entry.mismatched} px changed</span>`
        : "";

  return `<section class="viewport-case">
  <h3>${entry.viewport}${statusLabel}</h3>
  <div class="grid">
    <figure><figcaption>${baseCaption}</figcaption>${baseCell}</figure>
    <figure><figcaption>PR (after)</figcaption><img src="${entry.prFile}" alt="pr ${entry.route} ${entry.viewport}" /></figure>
    <figure><figcaption>Diff</figcaption>${diffCell}</figure>
  </div>
</section>`;
}

function groupEntriesByRoute(entries) {
  const byRoute = new Map();
  for (const entry of entries) {
    const list = byRoute.get(entry.route) ?? [];
    list.push(entry);
    byRoute.set(entry.route, list);
  }
  return [...byRoute.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * @param {VisualManifestEntry[]} entries
 * @param {{ baseLabel: string }} options
 */
export function buildReportHtml(entries, { baseLabel }) {
  const routeBlocks = groupEntriesByRoute(entries)
    .map(([route, routeEntries]) => {
      const needsReview = routeNeedsReview(routeEntries);
      const openAttr = needsReview ? " open" : "";
      const modifier = needsReview
        ? "route-case--review"
        : "route-case--unchanged";
      const summary = formatRouteSummary(route, routeEntries, needsReview);
      const viewportBlocks = routeEntries
        .map((entry) => buildViewportCaseHtml(entry))
        .join("\n");
      return `<details class="route-case ${modifier}"${openAttr}>
  <summary>${summary}</summary>
  <div class="route-case__body">
${viewportBlocks}
  </div>
</details>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>InkAds visual review</title>
  <style>
    body { margin: 0; font: 14px/1.4 system-ui, sans-serif; background: #111; color: #eee; }
    header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #333; }
    header p { color: #aaa; max-width: 70ch; }
    .report-controls { margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .report-controls button {
      font: inherit;
      padding: 0.35rem 0.75rem;
      border: 1px solid #444;
      border-radius: 4px;
      background: #222;
      color: #eee;
      cursor: pointer;
    }
    .report-controls button:hover { background: #333; }
    .route-case { border-bottom: 1px solid #333; }
    .route-case > summary {
      padding: 1rem 1.5rem;
      cursor: pointer;
      font-size: 1.05rem;
      font-weight: 500;
      list-style: none;
    }
    .route-case > summary::-webkit-details-marker { display: none; }
    .route-case > summary::before {
      content: "▸ ";
      color: #888;
    }
    .route-case[open] > summary::before { content: "▾ "; }
    .route-case--unchanged > summary { color: #aaa; }
    .route-case__body { padding: 0 1.5rem 1.5rem; }
    .viewport-case { margin-top: 1rem; }
    .viewport-case h3 { margin: 0 0 0.75rem; font-size: 0.95rem; color: #ccc; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    figure { margin: 0; background: #000; border: 1px solid #333; padding: 0.5rem; }
    figcaption { font-size: 12px; color: #aaa; margin-bottom: 0.5rem; }
    img { width: 100%; height: auto; display: block; background: #222; }
    .missing, .ok { color: #888; padding: 2rem 0.5rem; }
    .changed { color: #ffb300; font-weight: 600; }
    @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>InkAds visual review</h1>
    <p>
      Base = <code>${baseLabel}</code> (pre-PR).
      PR = local build for this branch (post-PR).
      Diff highlights changed pixels in red.
      Unchanged routes are collapsed by default — expand only what you need to review.
    </p>
    <p class="report-controls">
      <button type="button" id="expand-all">Expand all</button>
      <button type="button" id="collapse-unchanged">Collapse unchanged</button>
    </p>
  </header>
  ${routeBlocks}
  <script>
    document.getElementById("expand-all")?.addEventListener("click", () => {
      document.querySelectorAll(".route-case").forEach((el) => { el.open = true; });
    });
    document.getElementById("collapse-unchanged")?.addEventListener("click", () => {
      document.querySelectorAll(".route-case--unchanged").forEach((el) => {
        el.open = false;
      });
    });
  </script>
</body>
</html>
`;
}
