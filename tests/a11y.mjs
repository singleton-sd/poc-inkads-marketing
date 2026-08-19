/* eslint-disable no-undef */
import assert from "node:assert/strict";
import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const distDir = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.A11Y_PORT ?? 4173);

if (!existsSync(distDir)) {
  throw new Error(`Missing dist directory at ${distDir}. Run pnpm build first.`);
}

function contentTypeForPath(pathname) {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  if (pathname.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (pathname.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function normalizePathname(urlPath) {
  const cleaned = urlPath.replace(/\?.*$/, "").replace(/\/+$/, "");
  if (cleaned === "") return "/index.html";
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    const pathname = normalizePathname(req.url);
    const filePath = `${distDir}${pathname === "/" ? "/index.html" : pathname}`;
    const fsPath = filePath;

    // For non-existent assets, return 404 (do not fall through to index).
    if (!existsSync(fsPath)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    res.setHeader("Content-Type", contentTypeForPath(pathname));

    // Serve text-based files in one go for simplicity.
    if (
      pathname.endsWith(".html") ||
      pathname.endsWith(".css") ||
      pathname.endsWith(".js") ||
      pathname.endsWith(".xml") ||
      pathname.endsWith(".txt")
    ) {
      const content = await readFile(fsPath, "utf8");
      res.end(content);
      return;
    }

    createReadStream(fsPath).pipe(res);
  } catch (err) {
    res.statusCode = 500;
    res.end(String(err));
  }
});

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  // 1) Axe accessibility scan: fail on serious/critical only.
  const axeResults = await new AxeBuilder({ page }).analyze();
  const violations = axeResults.violations ?? [];
  const severe = violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

  if (severe.length > 0) {
    console.log(
      "Accessibility violations (impact critical/serious):\n" +
        severe
          .map((v) => `- ${v.impact}: ${v.id} (${v.nodes.length} nodes)`)
          .join("\n"),
    );
    throw new Error(
      `Accessibility scan failed: ${severe.length} critical/serious violation(s).`,
    );
  }

  // 2) Keyboard-only reachability + activation for every focusable interactive element.
  const interactiveHrefs = await page.evaluate(() => {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    return Array.from(document.querySelectorAll(selector))
      .filter((el) => isVisible(el))
      .map((el) => el.getAttribute("href") ?? null)
      .filter(Boolean);
  });

  const uniqueHrefs = Array.from(new Set(interactiveHrefs));

  // Ensure we have at least the expected “skip link + main anchors”.
  assert.ok(
    uniqueHrefs.length >= 4,
    `Expected at least 4 unique interactive hrefs, got ${uniqueHrefs.length}`,
  );

  const visited = new Set();
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(30);
    const activeHref = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      return el.getAttribute?.("href") ?? null;
    });
    if (activeHref) visited.add(activeHref);
    if (visited.size >= uniqueHrefs.length) break;
  }

  assert.equal(
    visited.size,
    uniqueHrefs.length,
    `Keyboard reachability failed: expected to reach ${Array.from(
      uniqueHrefs,
    ).join(", ")}, but reached ${Array.from(visited).join(", ")}.`,
  );

  // Activate every element via Enter.
  for (const href of uniqueHrefs) {
    await page.evaluate((targetHref) => {
      const el = document.querySelector(`a[href="${targetHref}"]`);
      if (el instanceof HTMLElement) el.focus();
    }, href);

    await page.keyboard.press("Enter");

    if (href.startsWith("#")) {
      await page.waitForFunction(
        (h) => window.location.hash === h,
        href,
        { timeout: 3000 },
      );
    } else if (href === "/") {
      // Brand/home may re-navigate; just ensure the main landmark is present.
      await page.waitForSelector("#main-content", { timeout: 5000 });
    }
  }

  console.log("Accessibility checks passed");
} finally {
  await context.close();
  await browser.close();
  server.close();
}

