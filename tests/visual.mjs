/**
 * Full-page visual screenshots for PR review.
 *
 * Serves `dist/`, walks HTML routes (respecting Astro `BASE_URL` / preview
 * subpaths), and writes desktop + mobile PNGs under `test-results/visual/`.
 *
 * Run after `pnpm build`. Optional env:
 * - VISUAL_BASE_PATH — Astro base used for the build (e.g. `/pr-preview/pr-12/`)
 * - VISUAL_PORT — fixed port (default: ephemeral)
 */
import assert from "node:assert/strict";
import http from "node:http";
import { createReadStream, existsSync, mkdirSync, readdirSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(rootDir, "dist");
const outDir = path.join(rootDir, "test-results", "visual");
const port = Number(process.env.VISUAL_PORT ?? 0);
const basePath = normalizeBase(process.env.VISUAL_BASE_PATH ?? "/");

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
  // Astro static routes: /about/ -> /about/index.html or /about.html
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
      // Skip Decap admin from marketing page visuals.
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
mkdirSync(outDir, { recursive: true });

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
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const url = `${origin}${publicUrl(route.urlPath)}`;
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      assert.ok(
        response && response.ok(),
        `Failed to load ${url}: ${response?.status()}`,
      );

      // Prefer full page; clamp extremely tall pages for artifact size.
      const filename = `${routeSlug(route.urlPath)}-${viewport.name}.png`;
      const filePath = path.join(outDir, filename);
      await page.screenshot({
        path: filePath,
        fullPage: true,
        animations: "disabled",
      });

      manifest.push({
        route: route.urlPath || "/",
        viewport: viewport.name,
        file: filename,
        url: publicUrl(route.urlPath),
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

await writeFile(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify({ basePath, routes: manifest }, null, 2)}\n`,
  "utf8",
);

console.log(
  `Visual screenshots: ${manifest.length} files written to ${outDir}`,
);
