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
  assert.match(form, /Form preview complete\./);
  assert.match(form, /Nothing was sent\./);
  assert.doesNotMatch(form, /fetch\(|action=/);
});

test("contact content uses transparent non-delivery messaging", async () => {
  const page = await readFile(new URL("src/pages/contact.astro", root), "utf8");
  const content = await readFile(
    new URL("src/content/pages/contact.md", root),
    "utf8",
  );
  const form = await readFile(
    new URL("src/components/ContactForm.astro", root),
    "utf8",
  );
  const publicCopy = `${page}\n${content}\n${form}`;

  assert.match(publicCopy, /preview only/i);
  assert.match(publicCopy, /Nothing was sent\./);
  assert.match(publicCopy, /hello@inkads\.poc\.singletonsd\.com/);
  assert.doesNotMatch(
    publicCopy,
    /Send request|request received|We'll be in touch/i,
  );
  assert.doesNotMatch(
    publicCopy,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});
