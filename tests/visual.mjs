/**
 * Full-page visual screenshots for PR review, with optional base comparison.
 *
 * Serves the PR `dist/` build, screenshots every HTML route at desktop + mobile,
 * then (when VISUAL_BASE_URL is set) screenshots the same paths on the base site
 * (usually production) and writes pixel diffs.
 *
 * Output under `test-results/visual/`:
 * - `pr/<route>-<viewport>.png` — this PR
 * - `base/<route>-<viewport>.png` — production / base (when the route exists)
 * - `diff/<route>-<viewport>.png` — red pixel diff (when both exist and differ)
 * - `index.html` — side-by-side review page
 * - `manifest.json`
 *
 * Env:
 * - VISUAL_BASE_PATH — Astro base used for the PR build (e.g. `/pr-preview/pr-12/`)
 * - VISUAL_BASE_URL — site to treat as “before” (default: production custom domain)
 * - VISUAL_PORT — fixed local port (default: ephemeral)
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
const baseSiteUrl = (
  process.env.VISUAL_BASE_URL ?? "https://inkads.poc.singletonsd.com"
).replace(/\/$/, "");

if (!existsSync(distDir)) {
  throw new Error(
    `Missing dist directory at ${distDir}. Run pnpm build first.`,
  );
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

function stripBase(urlPath) {
  if (basePath === "/") return urlPath;
  if (urlPath === basePath.slice(0, -1)) return "/";
  if (urlPath.startsWith(basePath)) {
    return `/${urlPath.slice(basePath.length)}`;
  }
  return urlPath;
}

function normalizePathname(urlPath) {
  const cleaned = stripBase(urlPath.replace(/\?.*$/, "").replace(/\/+$/, ""));
  if (cleaned === "" || cleaned === "/") return "/index.html";
  if (cleaned.endsWith(".html")) return cleaned;
  const asDir = `${cleaned}/index.html`;
  if (existsSync(path.join(distDir, asDir))) return asDir;
  const asFile = `${cleaned}.html`;
  if (existsSync(path.join(distDir, asFile))) return asFile;
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
      if (entry.name === "admin") continue;
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

async function screenshotPage(browser, url, viewport, filePath) {
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
    if (!response || status >= 400) {
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
      const baseCell = entry.baseFile
        ? `<img src="${entry.baseFile}" alt="base ${entry.route} ${entry.viewport}" />`
        : `<p class="missing">No base (new route or missing on ${baseSiteUrl})</p>`;
      const diffCell = entry.diffFile
        ? `<img src="${entry.diffFile}" alt="diff ${entry.route} ${entry.viewport}" />`
        : entry.baseFile
          ? `<p class="ok">No pixel diff</p>`
          : `<p class="missing">—</p>`;
      const changedLabel = entry.mismatched
        ? ` · <span class="changed">${entry.mismatched} px changed</span>`
        : "";
      return `<section class="case">
  <h2>${entry.route} · ${entry.viewport}${changedLabel}</h2>
  <div class="grid">
    <figure><figcaption>Base (before)</figcaption>${baseCell}</figure>
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
      Base = <code>${baseSiteUrl}</code> (pre-PR).
      PR = local build for this branch (post-PR).
      Diff highlights changed pixels in red.
    </p>
  </header>
  ${rows}
</body>
</html>
`;
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    const pathname = normalizePathname(req.url);
    const fsPath = path.join(distDir, pathname);

    if (!existsSync(fsPath)) {
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

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
const actualPort = server.address()?.port;
assert.ok(
  typeof actualPort === "number" && actualPort > 0,
  "Failed to pick an available port",
);
const origin = `http://127.0.0.1:${actualPort}`;

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

      const prUrl = `${origin}${publicUrl(route.urlPath)}`;
      const prShot = await screenshotPage(browser, prUrl, viewport, prFile);
      assert.ok(
        prShot.ok,
        `Failed to load PR route ${prUrl}: ${prShot.status}`,
      );

      let baseOk = false;
      let mismatched = 0;
      if (!skipBase) {
        const baseUrl = `${baseSiteUrl}${sitePath(route.urlPath)}`;
        const baseShot = await screenshotPage(
          browser,
          baseUrl,
          viewport,
          baseFile,
        );
        baseOk = baseShot.ok;
        if (!baseOk) {
          await rm(baseFile, { force: true });
        } else {
          mismatched = diffPngs(baseFile, prFile, diffFile);
          if (mismatched === 0) {
            await rm(diffFile, { force: true });
          }
        }
      }

      manifest.push({
        route: route.urlPath || "/",
        viewport: viewport.name,
        prFile: prRel,
        baseFile: baseOk ? baseRel : null,
        diffFile: mismatched > 0 ? diffRel : null,
        mismatched: mismatched > 0 ? mismatched : 0,
        prUrl: publicUrl(route.urlPath),
        baseUrl: skipBase ? null : `${baseSiteUrl}${sitePath(route.urlPath)}`,
        status: baseOk ? (mismatched > 0 ? "changed" : "unchanged") : "new",
      });
    }
  }
} finally {
  await browser.close();
  server.close();
}

await writeFile(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      basePath,
      baseSiteUrl: skipBase ? null : baseSiteUrl,
      routes: manifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
await writeFile(path.join(outDir, "index.html"), buildReportHtml(manifest));

const changed = manifest.filter((m) => m.status === "changed").length;
const created = manifest.filter((m) => m.status === "new").length;
console.log(
  `Visual screenshots: ${manifest.length} comparisons → ${outDir} (${changed} changed, ${created} new). Open index.html`,
);
