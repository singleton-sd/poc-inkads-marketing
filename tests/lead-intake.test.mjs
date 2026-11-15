import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

const {
  LEAD_BODY_MAX_BYTES,
  LEAD_CONSENT_TEXT_VERSION,
  LEAD_INTAKE_URL,
  LEAD_MESSAGE_MAX,
  LEAD_PRODUCT,
  LEAD_SOURCE_SITE,
  LEAD_WAITLIST_FEATURE,
  buildLeadRequest,
  contactRolePrefix,
  leadAttemptFingerprint,
  leadRequestBytes,
  mapLeadHttpError,
  sourcePageFromLocation,
  submissionIdForAttempt,
  submitLeadRequest,
} = await import(
  pathToFileURL(new URL("src/lib/lead-intake.ts", root).pathname).href
);

const { SAFE_MESSAGE_MAX } = await import(
  pathToFileURL(new URL("src/lib/contact-form-schema.ts", root).pathname).href
);

const SUBMISSION_ID = "550e8400-e29b-41d4-a716-446655440000";

function contactInput(overrides = {}) {
  return {
    formType: "contact",
    submissionId: SUBMISSION_ID,
    name: "Ada Lovelace",
    email: "Ada@Example.com",
    company: "Analytical Engines",
    phone: "+61 400 000 000",
    message: "Please get in touch about a venue pilot.",
    role: "Venue owner / operator",
    consent: true,
    marketingOptIn: false,
    turnstileToken: "test-turnstile-token",
    website: "",
    sourcePage: "/contact",
    ...overrides,
  };
}

test("contact payload matches the job-kit lead schema fields", () => {
  const body = buildLeadRequest(contactInput());

  assert.equal(body.sourceSite, LEAD_SOURCE_SITE);
  assert.equal(body.sourceSite, "https://inkads.poc.singletonsd.com");
  assert.equal(body.sourcePage, "/contact");
  assert.equal(body.submissionId, SUBMISSION_ID);
  assert.equal(body.name, "Ada Lovelace");
  assert.equal(body.email, "ada@example.com");
  assert.equal(body.company, "Analytical Engines");
  assert.equal(body.phone, "+61 400 000 000");
  assert.equal(body.consent, true);
  assert.equal(body.consentTextVersion, LEAD_CONSENT_TEXT_VERSION);
  assert.equal(body.marketingOptIn, false);
  assert.equal(body.turnstileToken, "test-turnstile-token");
  assert.equal(body.formType, "contact");
  assert.equal(body.product, LEAD_PRODUCT);
  assert.equal(body.product, "inkads");
  assert.match(body.message, /I am a… Venue owner \/ operator/);
  assert.match(body.message, /Please get in touch about a venue pilot\./);
  assert.equal("role" in body, false);
  assert.equal("website" in body && body.website !== undefined, false);
  assert.equal("feature" in body && body.feature !== undefined, false);
  assert.ok(leadRequestBytes(body) < LEAD_BODY_MAX_BYTES);
});

test("waitlist payload requires product and feature", () => {
  const body = buildLeadRequest(
    contactInput({
      formType: "waitlist",
      message: "",
      role: undefined,
      phone: "",
      company: "",
      sourcePage: "/waitlist",
    }),
  );

  assert.equal(body.formType, "waitlist");
  assert.equal(body.product, "inkads");
  assert.equal(body.feature, LEAD_WAITLIST_FEATURE);
  assert.equal(body.feature, "venues waitlist");
  assert.equal(body.sourcePage, "/waitlist");
  assert.equal(body.message, undefined);
  assert.equal(body.company, undefined);
  assert.equal(body.phone, undefined);
  assert.deepEqual(
    Object.keys(body).sort(),
    [
      "consent",
      "consentTextVersion",
      "email",
      "feature",
      "formType",
      "marketingOptIn",
      "name",
      "product",
      "sourcePage",
      "sourceSite",
      "submissionId",
      "turnstileToken",
    ].sort(),
  );
});

test("omits empty optional fields and keeps honeypot only when filled", () => {
  const emptyHoneypot = buildLeadRequest(
    contactInput({ company: "  ", phone: " ", website: "" }),
  );
  assert.equal(emptyHoneypot.company, undefined);
  assert.equal(emptyHoneypot.phone, undefined);
  assert.equal(emptyHoneypot.website, undefined);

  const spam = buildLeadRequest(
    contactInput({ website: "https://spam.example" }),
  );
  assert.equal(spam.website, "https://spam.example");
});

test("prefixed contact message stays within LEAD_MESSAGE_MAX", () => {
  const role = "Venue owner / operator";
  const prefix = contactRolePrefix(role);
  const body = buildLeadRequest(
    contactInput({
      role,
      message: "x".repeat(LEAD_MESSAGE_MAX),
    }),
  );

  assert.ok(body.message);
  assert.equal(body.message.length, LEAD_MESSAGE_MAX);
  assert.equal(body.message.startsWith(prefix), true);
  assert.equal(SAFE_MESSAGE_MAX + prefix.length, LEAD_MESSAGE_MAX);
  assert.ok(SAFE_MESSAGE_MAX < LEAD_MESSAGE_MAX);
});

test("sourcePage strips Astro preview base and trailing slashes", () => {
  assert.equal(sourcePageFromLocation("/contact/", "/"), "/contact");
  assert.equal(
    sourcePageFromLocation("/pr-preview/pr-9/contact/", "/pr-preview/pr-9/"),
    "/contact",
  );
  assert.equal(sourcePageFromLocation("/", "/"), "/");
});

test("maps 400 field paths, 404 function_disabled, and retry statuses", () => {
  const invalid = mapLeadHttpError(400, {
    error: "payload_invalid",
    details: ["email", "consent"],
  });
  assert.equal(invalid.kind, "validation");
  assert.match(invalid.message, /Email/);
  assert.match(invalid.message, /Consent/);
  assert.deepEqual(invalid.fields, ["email", "consent"]);

  const tooLarge = mapLeadHttpError(413, { error: "payload_too_large" });
  assert.equal(tooLarge.kind, "validation");
  assert.match(tooLarge.message, /shorten the message/i);
  assert.deepEqual(tooLarge.fields, ["message"]);

  const media = mapLeadHttpError(415, { error: "unsupported_media_type" });
  assert.equal(media.kind, "retry");
  assert.match(media.message, /try again/i);

  const disabled = mapLeadHttpError(404, { error: "function_disabled" });
  assert.equal(disabled.kind, "unavailable");
  assert.match(disabled.message, /temporarily unavailable/i);

  for (const status of [403, 429, 500, 503]) {
    const retry = mapLeadHttpError(status, { error: "turnstile_failed" });
    assert.equal(retry.kind, "retry", `status ${status}`);
    assert.match(retry.message, /try again/i);
  }
});

test("retries reuse submissionId until the form payload changes", () => {
  const first = leadAttemptFingerprint(contactInput());
  const kept = submissionIdForAttempt(SUBMISSION_ID, null, first);
  assert.equal(kept.submissionId, SUBMISSION_ID);
  assert.equal(kept.rotated, false);

  const retry = submissionIdForAttempt(SUBMISSION_ID, first, first);
  assert.equal(retry.submissionId, SUBMISSION_ID);
  assert.equal(retry.rotated, false);

  const edited = leadAttemptFingerprint(
    contactInput({ message: "A different enquiry." }),
  );
  const rotated = submissionIdForAttempt(SUBMISSION_ID, first, edited);
  assert.notEqual(rotated.submissionId, SUBMISSION_ID);
  assert.match(rotated.submissionId, /^[0-9a-f-]{36}$/i);
  assert.equal(rotated.rotated, true);
});

test("submitLeadRequest posts JSON under 16 KB to the shared API", async () => {
  const posts = [];
  const fetchImpl = async (url, init) => {
    posts.push({ url, init });
    return new Response(JSON.stringify({ id: SUBMISSION_ID }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  };

  const body = buildLeadRequest(contactInput());
  const result = await submitLeadRequest(body, fetchImpl);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.id, SUBMISSION_ID);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, LEAD_INTAKE_URL);
  assert.equal(posts[0].init.method, "POST");
  assert.equal(posts[0].init.credentials, "omit");
  assert.equal(posts[0].init.headers["Content-Type"], "application/json");
  const sent = JSON.parse(posts[0].init.body);
  assert.equal(sent.formType, "contact");
  assert.equal(sent.sourceSite, LEAD_SOURCE_SITE);
  assert.ok(
    Buffer.byteLength(posts[0].init.body, "utf8") < LEAD_BODY_MAX_BYTES,
  );
});

test("submitLeadRequest treats 409 as already-received success", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ id: SUBMISSION_ID }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  const result = await submitLeadRequest(
    buildLeadRequest(contactInput()),
    fetchImpl,
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.id, SUBMISSION_ID);
});

test("submitLeadRequest treats function_disabled as unavailable", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: "function_disabled" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  const result = await submitLeadRequest(
    buildLeadRequest(contactInput()),
    fetchImpl,
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.kind, "unavailable");
    assert.match(result.message, /temporarily unavailable/i);
  }
});
