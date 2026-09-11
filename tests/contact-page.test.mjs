import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("contact page uses shared chrome and a split MetaPair + form layout", async () => {
  const page = await readFile(new URL("src/pages/contact.astro", root), "utf8");
  const content = await readFile(
    new URL("src/content/pages/contact.md", root),
    "utf8",
  );

  assert.match(page, /BaseLayout/);
  assert.match(page, /ContactForm/);
  assert.match(page, /MetaPair/);
  assert.match(page, /contact-page/);
  assert.match(page, /hello@inkads\.poc\.singletonsd\.com/);
  assert.match(page, /mailto:/);
  assert.match(content, /eyebrow: Request a demo/);
  assert.match(content, /Let's talk about your space or campaign\./);
});

test("contact form posts to PostKit with loading and error states", async () => {
  const island = await readFile(
    new URL("src/components/ContactFormIsland.tsx", root),
    "utf8",
  );
  const form = await readFile(
    new URL("src/components/ContactForm.astro", root),
    "utf8",
  );

  assert.match(island, /PUBLIC_POSTKIT_API_BASE_URL|postkitApiBaseUrl/);
  assert.match(island, /fetch\(`\$\{apiBase\}\/contact`/);
  assert.match(island, /startsWith\("https:\/\/"\)/);
  assert.match(island, /AbortController/);
  assert.match(island, /setCustomValidity/);
  assert.match(island, /partnership/);
  assert.match(island, /X-PostKit-Contact-Preview/);
  assert.match(island, /data-contact-form-error/);
  assert.match(island, /data-contact-form-success/);
  assert.match(form, /withBase\("\/privacy"/);
  assert.match(form, /client:load/);
  assert.match(form, /ContactFormIsland/);
  assert.doesNotMatch(island, /Preview form|Nothing was sent/);
  assert.doesNotMatch(form, /Preview form|Nothing was sent/);
});

test("contact form prefills role/name/email from safe query params", async () => {
  const sync = await readFile(
    new URL("src/lib/form-query-sync.ts", root),
    "utf8",
  );
  const hook = await readFile(
    new URL("src/hooks/useFormQuerySync.ts", root),
    "utf8",
  );
  const island = await readFile(
    new URL("src/components/ContactFormIsland.tsx", root),
    "utf8",
  );
  const form = await readFile(
    new URL("src/components/ContactForm.astro", root),
    "utf8",
  );
  const docs = await readFile(
    new URL("docs/design-reference/contact.md", root),
    "utf8",
  );

  assert.match(sync, /ROLE_QUERY_TO_OPTION/);
  assert.match(sync, /ROLE_OPTION_TO_QUERY/);
  assert.match(sync, /resolveRoleOption/);
  assert.match(sync, /venue:\s*"Venue owner \/ operator"/);
  assert.match(sync, /advertiser:\s*"Advertiser \/ brand"/);
  assert.match(sync, /other:\s*"Other"/);
  assert.match(sync, /partnership:\s*"Venue owner \/ operator"/);
  assert.match(sync, /sales:\s*"Advertiser \/ brand"/);
  assert.match(sync, /general:\s*"Other"/);
  assert.match(sync, /SAFE_EMAIL_RE/);
  assert.match(sync, /SAFE_NAME_MAX/);
  assert.match(sync, /history\.replaceState/);
  assert.match(sync, /ROLE_OPTION_VALUES\.has\(trimmed\)/);

  assert.match(hook, /useFormQuerySync/);
  assert.match(
    hook,
    /replaceUrlSearchParam|history\.replaceState|replaceState/,
  );
  assert.match(hook, /popstate/);

  assert.match(island, /useFormQuerySync/);
  assert.match(island, /serializeRoleQuery/);
  assert.match(island, /parseNameFromQuery/);
  assert.match(island, /parseEmailFromQuery/);
  assert.match(form, /client:load/);
  assert.match(form, /ContactFormIsland/);

  // Regression: each email segment must reject C0/DEL controls (e.g. %00 / NUL).
  assert.match(
    sync,
    /SAFE_EMAIL_RE\s*=\s*\/\^[^\n]*\\u0000-\\u001f\\u007f[^\n]*\\u0000-\\u001f\\u007f[^\n]*\\u0000-\\u001f\\u007f/,
  );

  const { SAFE_EMAIL_RE } = await import(
    pathToFileURL(new URL("src/lib/form-query-sync.ts", root).pathname).href
  );
  assert.equal(SAFE_EMAIL_RE.test("user@example.com"), true);
  assert.equal(SAFE_EMAIL_RE.test("user\u0000@example.com"), false);
  assert.equal(SAFE_EMAIL_RE.test("user@exam\u0007ple.com"), false);
  assert.equal(SAFE_EMAIL_RE.test("user@example.com\u007f"), false);

  assert.match(docs, /role=venue/);
  assert.match(docs, /Do not put secrets in query strings/i);
  assert.match(docs, /useFormQuerySync|React island/i);
});

test("contact content describes live enquiry delivery", async () => {
  const content = await readFile(
    new URL("src/content/pages/contact.md", root),
    "utf8",
  );
  const island = await readFile(
    new URL("src/components/ContactFormIsland.tsx", root),
    "utf8",
  );
  const publicCopy = `${content}\n${island}`;

  assert.match(publicCopy, /Send message/);
  assert.match(publicCopy, /Message sent/);
  assert.doesNotMatch(publicCopy, /preview only/i);
  assert.doesNotMatch(
    publicCopy,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});
