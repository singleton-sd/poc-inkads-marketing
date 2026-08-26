/**
 * Full-page visual screenshots for PR review, with base comparison.
 *
 * Serves the PR `dist/` build, screenshots every HTML route at desktop + mobile,
 * then screenshots the same paths from a baseline and writes pixel diffs.
 *
 * Baseline (preferred for CI): `VISUAL_BASE_DIR` — a locally built `dist/` of the
 * PR base SHA (same Astro base path as the PR visual build). This avoids false
 * diffs when live production is stale or behind main.
 *
 * Fallback: `VISUAL_BASE_URL` (default production) when no local baseline dir.
 *
 * Output under `test-results/visual/`:
 * - `pr/<route>-<viewport>.png` — this PR
 * - `base/<route>-<viewport>.png` — baseline (when the route exists)
 * - `diff/<route>-<viewport>.png` — red pixel diff (when both exist and differ)
 * - `index.html` — side-by-side review page
 * - `manifest.json` — includes `summary` for CI gating
 *
 * Capture always exits 0 on successful screenshots. Use `pnpm test:visual:gate`
 * (or CI job `visual-review`) to fail when routes are `changed` or `new`.
 *
 * Env:
 * - VISUAL_BASE_PATH — Astro base used for the PR (and baseline) build
 * - VISUAL_BASE_DIR — local baseline `dist/` directory (preferred over URL)
 * - VISUAL_BASE_SHA — git SHA of the baseline build (recorded in manifest)
 * - VISUAL_BASE_URL — remote “before” site if VISUAL_BASE_DIR is unset
 * - VISUAL_PORT — fixed local port for the PR server (default: ephemeral)
 * - VISUAL_SKIP_BASE — set to `1` to only capture the PR build
 */
import assert from "node:assert/strict";
import http from "node:http";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { chromium } from "playwright";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(rootDir, "dist");
const outDir = path.join(rootDir, "test-results", "visual");
const port = Number(process.env.VISUAL_PORT ?? 0);
const basePath = normalizeBase(process.env.VISUAL_BASE_PATH ?? "/");
const skipBase = process.env.VISUAL_SKIP_BASE === "1";
const baseDistDir = process.env.VISUAL_BASE_DIR
  ? path.resolve(process.env.VISUAL_BASE_DIR)
  : null;
const baseSha = (process.env.VISUAL_BASE_SHA ?? "").trim() || null;
const baseSiteUrl = (
  process.env.VISUAL_BASE_URL ?? "https://inkads.poc.singletonsd.com"
).replace(/\/$/, "");
const baseLabel = baseDistDir ? `local:${baseDistDir}` : baseSiteUrl;

if (!existsSync(distDir)) {
  throw new Error(
    `Missing dist directory at ${distDir}. Run pnpm build first.`,
  );
}
if (baseDistDir && !existsSync(baseDistDir)) {
  throw new Error(`Missing VISUAL_BASE_DIR at ${baseDistDir}.`);
}

function normalizeBase(value) {
  if (!value || value === "/") return "/";
  const withLeading = value.startsWith("/") ? value : `/${value}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function contentTypeForPath(pathname) {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  if (pathname.endsWith(".woff2")) return "font/woff2";
  if (pathname.endsWith(".woff")) return "font/woff";
  if (pathname.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (pathname.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

function stripBase(urlPath, pathPrefix) {
  if (pathPrefix === "/") return urlPath;
  if (urlPath === pathPrefix.slice(0, -1)) return "/";
  if (urlPath.startsWith(pathPrefix)) {
    return `/${urlPath.slice(pathPrefix.length)}`;
  }
  return urlPath;
}

function normalizePathname(root, pathPrefix, urlPath) {
  const cleaned = stripBase(
    urlPath.replace(/\?.*$/, "").replace(/\/+$/, ""),
    pathPrefix,
  );
  if (cleaned === "" || cleaned === "/") return "/index.html";
  if (cleaned.endsWith(".html")) return cleaned;
  const asDir = `${cleaned}/index.html`;
  if (existsSync(path.join(root, asDir))) return asDir;
  const asFile = `${cleaned}.html`;
  if (existsSync(path.join(root, asFile))) return asFile;
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function collectHtmlRoutes(dir = distDir, prefix = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  const routes = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      // Skip Decap admin and the hosted visual report folder itself.
      if (entry.name === "admin" || entry.name === "visual") continue;
      routes.push(...collectHtmlRoutes(full, rel));
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    if (entry.name === "404.html") {
      routes.push({ file: rel, urlPath: "404" });
      continue;
    }
    if (entry.name === "index.html") {
      const route = prefix === "" ? "" : prefix;
      routes.push({ file: rel, urlPath: route });
      continue;
    }
    routes.push({
      file: rel,
      urlPath: rel.replace(/\.html$/, ""),
    });
  }
  return routes;
}

function routeSlug(urlPath) {
  if (!urlPath || urlPath === "") return "home";
  return urlPath.replaceAll("/", "-").replace(/^-|-$/g, "") || "home";
}

function publicUrl(urlPath) {
  if (!urlPath) return basePath === "/" ? "/" : basePath;
  const suffix = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  if (basePath === "/") return `/${suffix}`;
  return `${basePath}${suffix}`;
}

function sitePath(urlPath) {
  if (!urlPath || urlPath === "") return "/";
  return urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
}

function createStaticServer(root, pathPrefix) {
  return http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.statusCode = 400;
        res.end("Bad request");
        return;
      }

      const pathname = normalizePathname(root, pathPrefix, req.url);
      const fsPath = path.join(root, pathname);

      if (!existsSync(fsPath)) {
        const notFound = path.join(root, "404.html");
        if (existsSync(notFound)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(await readFile(notFound));
          return;
        }
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      res.setHeader("Content-Type", contentTypeForPath(pathname));
      if (
        pathname.endsWith(".html") ||
        pathname.endsWith(".css") ||
        pathname.endsWith(".js") ||
        pathname.endsWith(".xml") ||
        pathname.endsWith(".txt") ||
        pathname.endsWith(".svg")
      ) {
        res.end(await readFile(fsPath));
        return;
      }

      createReadStream(fsPath).pipe(res);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });
}

async function listen(server, preferredPort = 0) {
  await new Promise((resolve) =>
    server.listen(preferredPort, "127.0.0.1", resolve),
  );
  const actual = server.address()?.port;
  assert.ok(typeof actual === "number" && actual > 0, "Failed to pick a port");
  return actual;
}

async function screenshotPage(
  browser,
  url,
  viewport,
  filePath,
  { allowNotFound = false } = {},
) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    const status = response?.status() ?? 0;
    if (!response || status >= 500) {
      return { ok: false, status };
    }
    if (status >= 400 && !(allowNotFound && status === 404)) {
      return { ok: false, status };
    }
    await page.screenshot({
      path: filePath,
      fullPage: true,
      animations: "disabled",
    });
    return { ok: true, status };
  } finally {
    await context.close();
  }
}

function padPng(img, width, height) {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  out.data.fill(0);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const src = (img.width * y + x) << 2;
      const dst = (width * y + x) << 2;
      out.data[dst] = img.data[src];
      out.data[dst + 1] = img.data[src + 1];
      out.data[dst + 2] = img.data[src + 2];
      out.data[dst + 3] = img.data[src + 3];
    }
  }
  return out;
}

function diffPngs(baseFilePath, prFilePath, diffFilePath) {
  const baseImg = PNG.sync.read(readFileSync(baseFilePath));
  const prImg = PNG.sync.read(readFileSync(prFilePath));
  const width = Math.max(baseImg.width, prImg.width);
  const height = Math.max(baseImg.height, prImg.height);
  const baseNorm = padPng(baseImg, width, height);
  const prNorm = padPng(prImg, width, height);
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(
    baseNorm.data,
    prNorm.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  );
  mkdirSync(path.dirname(diffFilePath), { recursive: true });
  writeFileSync(diffFilePath, PNG.sync.write(diff));
  return mismatched;
}

function buildReportHtml(entries) {
  const rows = entries
    .map((entry) => {
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
      return `<section class="case">
  <h2>${entry.route} · ${entry.viewport}${statusLabel}</h2>
  <div class="grid">
    <figure><figcaption>${baseCaption}</figcaption>${baseCell}</figure>
    <figure><figcaption>PR (after)</figcaption><img src="${entry.prFile}" alt="pr ${entry.route} ${entry.viewport}" /></figure>
    <figure><figcaption>Diff</figcaption>${diffCell}</figure>
  </div>
</section>`;
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
    .case { padding: 1.5rem; border-bottom: 1px solid #333; }
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
    </p>
  </header>
  ${rows}
</body>
</html>
`;
}

const prServer = createStaticServer(distDir, basePath);
const prPort = await listen(prServer, port);
const prOrigin = `http://127.0.0.1:${prPort}`;

let baseOrigin = null;
let baseServer = null;
if (!skipBase && baseDistDir) {
  baseServer = createStaticServer(baseDistDir, basePath);
  const basePort = await listen(baseServer, 0);
  baseOrigin = `http://127.0.0.1:${basePort}`;
}

await rm(outDir, { recursive: true, force: true });
for (const dir of ["pr", "base", "diff"]) {
  mkdirSync(path.join(outDir, dir), { recursive: true });
}

const routes = collectHtmlRoutes();
assert.ok(routes.length > 0, "Expected at least one HTML route in dist/");

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();
const manifest = [];

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const slug = `${routeSlug(route.urlPath)}-${viewport.name}`;
      const prRel = `pr/${slug}.png`;
      const baseRel = `base/${slug}.png`;
      const diffRel = `diff/${slug}.png`;
      const prFile = path.join(outDir, prRel);
      const baseFile = path.join(outDir, baseRel);
      const diffFile = path.join(outDir, diffRel);

      const prUrl = `${prOrigin}${publicUrl(route.urlPath)}`;
      const prShot = await screenshotPage(browser, prUrl, viewport, prFile);
      assert.ok(
        prShot.ok && prShot.status < 400,
        `Failed to load PR route ${prUrl}: ${prShot.status}`,
      );

      let baseOk = false;
      let baseMissing = false;
      let mismatched = 0;
      let baseUrl = null;
      if (!skipBase) {
        baseUrl = baseOrigin
          ? `${baseOrigin}${publicUrl(route.urlPath)}`
          : `${baseSiteUrl}${sitePath(route.urlPath)}`;
        const baseShot = await screenshotPage(
          browser,
          baseUrl,
          viewport,
          baseFile,
          { allowNotFound: true },
        );
        baseOk = baseShot.ok;
        baseMissing = baseOk && baseShot.status === 404;
        if (!baseOk) {
          await rm(baseFile, { force: true });
        } else {
          mismatched = diffPngs(baseFile, prFile, diffFile);
          if (mismatched === 0) {
            await rm(diffFile, { force: true });
          }
        }
      }

      const status = !baseOk
        ? "new"
        : baseMissing
          ? "new"
          : mismatched > 0
            ? "changed"
            : "unchanged";

      manifest.push({
        route: route.urlPath || "/",
        viewport: viewport.name,
        prFile: prRel,
        baseFile: baseOk ? baseRel : null,
        diffFile: mismatched > 0 ? diffRel : null,
        mismatched: mismatched > 0 ? mismatched : 0,
        prUrl: publicUrl(route.urlPath),
        baseUrl: skipBase ? null : baseUrl,
        status,
      });
    }
  }
} finally {
  await browser.close();
  prServer.close();
  baseServer?.close();
}

const changedRoutes = [
  ...new Set(
    manifest.filter((m) => m.status === "changed").map((m) => m.route),
  ),
].sort();
const newRoutes = [
  ...new Set(manifest.filter((m) => m.status === "new").map((m) => m.route)),
].sort();
const unchanged = manifest.filter((m) => m.status === "unchanged").length;
const summary = {
  total: manifest.length,
  unchanged,
  changed: changedRoutes.length,
  new: newRoutes.length,
  changedRoutes,
  newRoutes,
  hasDiffs: changedRoutes.length > 0 || newRoutes.length > 0,
};

await writeFile(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      basePath,
      baseSha: skipBase ? null : baseSha,
      baseLabel: skipBase ? null : baseLabel,
      baseSiteUrl: skipBase || baseDistDir ? null : baseSiteUrl,
      baseDistDir: skipBase ? null : baseDistDir,
      summary,
      routes: manifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
await writeFile(path.join(outDir, "index.html"), buildReportHtml(manifest));

console.log(
  `Visual screenshots: ${summary.total} comparisons → ${outDir} (${summary.changed} changed routes, ${summary.new} new routes). Open index.html`,
);
