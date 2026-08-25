import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("contact form remains client-side only with a success panel", async () => {
  const form = await readFile(
    new URL("src/components/ContactForm.astro", root),
    "utf8",
  );

  assert.match(form, /data-contact-form/);
  assert.match(form, /data-contact-form-success/);
  assert.match(form, /Thanks — request received\./);
  assert.doesNotMatch(form, /fetch\(|action=/);
});

test("contact content avoids unvalidated outcome claims", async () => {
  const page = await readFile(new URL("src/pages/contact.astro", root), "utf8");
  const content = await readFile(
    new URL("src/content/pages/contact.md", root),
    "utf8",
  );
  const publicCopy = `${page}\n${content}`;
  assert.doesNotMatch(
    publicCopy,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});
