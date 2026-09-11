/* eslint-disable no-undef */
/**
 * Playwright: contact form query prefill + role → URL sync.
 * Requires `pnpm build` first (serves dist/).
 */
import assert from "node:assert/strict";
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const distDir = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.CONTACT_PREFILL_PORT ?? 0);

if (!existsSync(distDir)) {
  throw new Error(
    `Missing dist directory at ${distDir}. Run pnpm build first.`,
  );
}

function contentTypeForPath(pathname) {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  if (pathname.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (pathname.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (pathname.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function normalizePathname(urlPath) {
  const cleaned = urlPath.replace(/\?.*$/, "").replace(/\/+$/, "");
  if (cleaned === "") return "/index.html";
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function resolveFsPath(urlPath) {
  const pathname = normalizePathname(urlPath);
  let fsPath = `${distDir}${pathname}`;
  if (existsSync(fsPath) && statSync(fsPath).isDirectory()) {
    fsPath = `${fsPath.replace(/\/$/, "")}/index.html`;
  }
  return {
    pathname: fsPath.startsWith(distDir)
      ? fsPath.slice(distDir.length)
      : pathname,
    fsPath,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    const { pathname, fsPath } = resolveFsPath(req.url);

    if (!existsSync(fsPath) || statSync(fsPath).isDirectory()) {
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
      pathname.endsWith(".txt")
    ) {
      res.end(await readFile(fsPath, "utf8"));
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

const browser = await chromium.launch();
const page = await browser.newPage();

async function waitForInputValue(selector, expected) {
  await page.waitForFunction(
    ({ sel, val }) => {
      const el = document.querySelector(sel);
      return el instanceof HTMLInputElement || el instanceof HTMLSelectElement
        ? el.value === val
        : false;
    },
    { sel: selector, val: expected },
    { timeout: 10_000 },
  );
}

try {
  await page.goto(`${origin}/contact/?role=venue`, {
    waitUntil: "networkidle",
  });
  await waitForInputValue("#contact-role", "Venue owner / operator");

  await page.goto(
    `${origin}/contact/?role=advertiser&name=Ada&email=ada@example.com`,
    { waitUntil: "networkidle" },
  );
  await waitForInputValue("#contact-role", "Advertiser / brand");
  await waitForInputValue("#contact-name", "Ada");
  await waitForInputValue("#contact-email", "ada@example.com");

  await page.goto(`${origin}/contact/?role=nope`, {
    waitUntil: "networkidle",
  });
  await waitForInputValue("#contact-role", "");

  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.waitForSelector("#contact-role");
  await page.locator("#contact-role").selectOption("Advertiser / brand");
  await page.waitForFunction(
    () =>
      new URL(window.location.href).searchParams.get("role") === "advertiser",
  );
  assert.match(page.url(), /[?&]role=advertiser(?:&|$)/);

  await page.locator("#contact-role").selectOption("Venue owner / operator");
  await page.waitForFunction(
    () => new URL(window.location.href).searchParams.get("role") === "venue",
  );

  console.log("contact-prefill: ok");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
