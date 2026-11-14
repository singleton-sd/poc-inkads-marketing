/* eslint-disable no-undef */
/**
 * Playwright: contact + waitlist POST /v1/leads (mocked).
 * Requires `pnpm build` with PUBLIC_TURNSTILE_SITE_KEY set.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const distDir = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.LEAD_FORMS_PORT ?? 0);

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
const context = await browser.newContext();
await context.addInitScript(() => {
  let lastOptions;
  window.turnstile = {
    render(container, options) {
      lastOptions = options;
      if (container instanceof HTMLElement) {
        container.dataset.turnstileReady = "true";
      }
      queueMicrotask(() => options?.callback?.("test-turnstile-token"));
      return "widget-test";
    },
    reset() {
      queueMicrotask(() => lastOptions?.callback?.("test-turnstile-token"));
    },
    remove() {},
  };
});
const page = await context.newPage();

async function mockLeads(handler) {
  const posts = [];
  await page.route("https://api.singletonsd.com/v1/leads", async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    posts.push({
      url: request.url(),
      method: request.method(),
      contentType: request.headers()["content-type"],
      body,
    });
    const response = await handler(body);
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.json),
    });
  });
  return posts;
}

try {
  const successPosts = await mockLeads(async () => ({
    status: 202,
    json: { id: "550e8400-e29b-41d4-a716-446655440000" },
  }));

  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-lead-turnstile]");
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example Pub");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-phone").fill("+61 400 000 000");
  await page.locator("#contact-role").selectOption("Venue owner / operator");
  await page
    .locator("#contact-message")
    .fill("Please follow up about a venue pilot.");
  await page.locator("#contact-consent").check();
  assert.equal(await page.locator("#contact-marketing").isChecked(), false);

  const submit = page.locator("[data-contact-form-submit]");
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await submit.click();
  await page.waitForSelector("[data-contact-form-success]:not([hidden])");

  assert.equal(successPosts.length, 1);
  assert.equal(successPosts[0].url, "https://api.singletonsd.com/v1/leads");
  assert.equal(successPosts[0].method, "POST");
  assert.match(successPosts[0].contentType, /application\/json/);
  const sent = successPosts[0].body;
  assert.equal(sent.formType, "contact");
  assert.equal(sent.product, "inkads");
  assert.equal(sent.sourceSite, "https://inkads.poc.singletonsd.com");
  assert.equal(sent.sourcePage, "/contact");
  assert.equal(sent.name, "Ada Lovelace");
  assert.equal(sent.email, "ada@example.com");
  assert.equal(sent.company, "Example Pub");
  assert.equal(sent.phone, "+61 400 000 000");
  assert.equal(sent.consent, true);
  assert.equal(sent.marketingOptIn, false);
  assert.equal(sent.turnstileToken, "test-turnstile-token");
  assert.match(sent.submissionId, /^[0-9a-f-]{36}$/i);
  assert.match(sent.message, /I am a… Venue owner \/ operator/);
  assert.equal("role" in sent, false);
  assert.ok(JSON.stringify(sent).length < 16 * 1024);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  const errorPosts = await mockLeads(async () => ({
    status: 400,
    json: { error: "payload_invalid", details: ["email"] },
  }));
  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example Pub");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-role").selectOption("Advertiser / brand");
  await page
    .locator("#contact-message")
    .fill("Please follow up about a campaign.");
  await page.locator("#contact-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-error]:not([hidden])");
  const errorText = await page.locator("[data-contact-form-error]").innerText();
  assert.match(errorText, /Email/i);
  assert.equal(errorPosts.length, 1);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("#contact-name-error");
  assert.equal(
    await page.locator("#contact-name").getAttribute("aria-describedby"),
    "contact-name-error",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "contact-name",
  );

  let retryCalls = 0;
  const retryPosts = await mockLeads(async () => {
    retryCalls += 1;
    if (retryCalls === 1) {
      return { status: 500, json: { error: "upstream" } };
    }
    return {
      status: 202,
      json: { id: "550e8400-e29b-41d4-a716-446655440002" },
    };
  });
  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example Pub");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-role").selectOption("Other");
  await page
    .locator("#contact-message")
    .fill("Retry without changing the payload.");
  await page.locator("#contact-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-error]:not([hidden])");
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-success]:not([hidden])");
  assert.equal(retryPosts.length, 2);
  assert.equal(
    retryPosts[0].body.submissionId,
    retryPosts[1].body.submissionId,
  );
  assert.match(retryPosts[0].body.submissionId, /^[0-9a-f-]{36}$/i);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  const duplicatePosts = await mockLeads(async () => ({
    status: 409,
    json: { id: "550e8400-e29b-41d4-a716-446655440003" },
  }));
  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example Pub");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-role").selectOption("Other");
  await page.locator("#contact-message").fill("Already received.");
  await page.locator("#contact-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-success]:not([hidden])");
  assert.equal(duplicatePosts.length, 1);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  const disabledPosts = await mockLeads(async () => ({
    status: 404,
    json: { error: "function_disabled" },
  }));
  await page.goto(`${origin}/waitlist/`, { waitUntil: "networkidle" });
  await page.locator("#waitlist-name").fill("Ada Lovelace");
  await page.locator("#waitlist-email").fill("ada@example.com");
  await page.locator("#waitlist-consent").check();
  assert.equal(await page.locator("#waitlist-marketing").isChecked(), false);
  await page.waitForFunction(
    () => !document.querySelector("[data-waitlist-form-submit]")?.disabled,
  );
  await page.locator("[data-waitlist-form-submit]").click();
  await page.waitForSelector("[data-waitlist-form-error]:not([hidden])");
  const waitlistError = await page
    .locator("[data-waitlist-form-error]")
    .innerText();
  assert.match(waitlistError, /temporarily unavailable/i);
  assert.equal(disabledPosts.length, 1);
  assert.equal(disabledPosts[0].body.formType, "waitlist");
  assert.equal(disabledPosts[0].body.product, "inkads");
  assert.equal(disabledPosts[0].body.feature, "venues waitlist");
  assert.equal(
    disabledPosts[0].body.sourceSite,
    "https://inkads.poc.singletonsd.com",
  );

  await page.unroute("https://api.singletonsd.com/v1/leads");
  const waitlistSuccess = await mockLeads(async () => ({
    status: 202,
    json: { id: "550e8400-e29b-41d4-a716-446655440001" },
  }));
  await page.goto(`${origin}/waitlist/`, { waitUntil: "networkidle" });
  await page.locator("#waitlist-name").fill("Ada Lovelace");
  await page.locator("#waitlist-email").fill("ada@example.com");
  await page.locator("#waitlist-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-waitlist-form-submit]")?.disabled,
  );
  await page.locator("[data-waitlist-form-submit]").click();
  await page.waitForSelector("[data-waitlist-form-success]:not([hidden])");
  assert.equal(waitlistSuccess.length, 1);
  assert.equal(waitlistSuccess[0].body.formType, "waitlist");

  console.log("lead-forms: ok");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
