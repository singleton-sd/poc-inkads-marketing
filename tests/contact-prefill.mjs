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
  await page.waitForSelector("#contact-phone");
  assert.equal(await page.locator("#contact-phone").inputValue(), "");
  const nameLabel = await page.locator("label[for='contact-name']").innerText();
  const companyLabel = await page
    .locator("label[for='contact-company']")
    .innerText();
  const phoneLabel = await page
    .locator("label[for='contact-phone']")
    .innerText();
  const messageLabel = await page
    .locator("label[for='contact-message']")
    .innerText();
  assert.match(nameLabel, /required/i);
  assert.doesNotMatch(nameLabel, /\*/);
  assert.match(companyLabel, /optional/i);
  assert.match(phoneLabel, /optional/i);
  assert.match(messageLabel, /required/i);
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

  assert.equal(
    await page
      .locator("[data-contact-form]")
      .locator("text=how did you hear")
      .count(),
    0,
  );
  assert.equal(
    await page.locator("[data-contact-form]").locator("text=waitlist").count(),
    0,
  );

  const submit = page.locator("[data-contact-form-submit]");
  if (await submit.isEnabled()) {
    await page.locator("#contact-name").fill("");
    await page.locator("#contact-email").fill("");
    await page.locator("#contact-phone").fill("");
    await page.locator("#contact-company").fill("");
    await page.locator("#contact-message").fill("");
    await page.locator("#contact-role").selectOption("");
    await submit.click();
    await page.waitForSelector("text=Name is required.");
    await page.waitForSelector("text=Email is required.");
    await page.waitForSelector("text=Message is required.");
    assert.equal(
      await page.locator("text=Venue / company is required.").count(),
      0,
    );
    assert.equal(await page.locator("text=Select an option.").count(), 0);

    const posts = [];
    await page.route("**/contact", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.continue();
        return;
      }
      posts.push({
        url: request.url(),
        body: request.postDataJSON(),
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "sent" }),
      });
    });

    await page.locator("#contact-role").selectOption("");
    await page.locator("#contact-name").fill("Ada Lovelace");
    await page.locator("#contact-email").fill("ada@example.com");
    await page.locator("#contact-phone").fill("+61 400 000 000");
    await page
      .locator("#contact-message")
      .fill("Please follow up about a pilot.");
    await submit.click();
    await page.waitForSelector("[data-contact-form-success]:not([hidden])");
    assert.equal(posts.length, 1);
    assert.match(posts[0].url, /\/contact$/);
    assert.equal(posts[0].body.name, "Ada Lovelace");
    assert.equal(posts[0].body.email, "ada@example.com");
    assert.equal(posts[0].body.subject, "general");
    assert.equal("phone" in posts[0].body, false);
    assert.match(posts[0].body.message, /Phone: \+61 400 000 000/);
    assert.match(posts[0].body.message, /Source: InkAds contact form/);
    assert.doesNotMatch(posts[0].body.message, /Venue \/ company:/);
  }

  console.log("contact-prefill: ok");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
