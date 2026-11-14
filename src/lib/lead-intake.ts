/**
 * Browser client for job-kit `POST /v1/leads` (ADR-0002).
 * Field names and limits match singleton-sd/job-kit `src/leads` on main.
 */

export const LEAD_INTAKE_URL = "https://api.singletonsd.com/v1/leads";
export const LEAD_SOURCE_SITE = "https://inkads.poc.singletonsd.com";
export const LEAD_PRODUCT = "inkads";
export const LEAD_WAITLIST_FEATURE = "venues waitlist";
export const LEAD_CONSENT_TEXT_VERSION = "inkads-privacy-2026-11-14";
export const LEAD_BODY_MAX_BYTES = 16 * 1024;

export const LEAD_NAME_MAX = 120;
export const LEAD_EMAIL_MAX = 254;
export const LEAD_COMPANY_MAX = 160;
export const LEAD_PHONE_MAX = 40;
export const LEAD_MESSAGE_MAX = 4000;
export const LEAD_FEATURE_MAX = 80;
export const LEAD_SOURCE_PAGE_MAX = 500;
export const LEAD_CONSENT_TEXT_VERSION_MAX = 64;
export const LEAD_TURNSTILE_TOKEN_MAX = 4096;
export const LEAD_WEBSITE_MAX = 500;

export const FETCH_TIMEOUT_MS = 15_000;

export type LeadFormType = "contact" | "waitlist";

export type LeadPayloadInput = {
  formType: LeadFormType;
  submissionId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
  role?: string;
  consent: true;
  marketingOptIn: boolean;
  turnstileToken: string;
  website?: string;
  sourcePage?: string;
};

export type LeadRequestBody = {
  sourceSite: typeof LEAD_SOURCE_SITE;
  sourcePage?: string;
  submissionId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  feature?: string;
  consent: true;
  consentTextVersion: typeof LEAD_CONSENT_TEXT_VERSION;
  marketingOptIn: boolean;
  turnstileToken: string;
  website?: string;
  formType: LeadFormType;
  product: typeof LEAD_PRODUCT;
  message?: string;
};

const FIELD_LABELS: Record<string, string> = {
  sourceSite: "Source site",
  sourcePage: "Source page",
  submissionId: "Submission",
  name: "Name",
  email: "Email",
  company: "Venue / company",
  phone: "Phone",
  feature: "Feature",
  consent: "Consent",
  consentTextVersion: "Consent version",
  marketingOptIn: "Marketing opt-in",
  turnstileToken: "Verification",
  website: "Website",
  formType: "Form type",
  product: "Product",
  message: "Message",
};

export type LeadSubmitSuccess = { ok: true; id: string };

export type LeadSubmitFailure = {
  ok: false;
  kind: "validation" | "unavailable" | "retry";
  message: string;
  fields: string[];
};

export type LeadSubmitResult = LeadSubmitSuccess | LeadSubmitFailure;

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function contactMessage(message: string, role: string | undefined): string {
  const body = message.trim();
  const roleLabel = present(role);
  if (!roleLabel) return body;
  return `I am a… ${roleLabel}\n\n${body}`;
}

function clipSourcePage(path: string): string | undefined {
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, LEAD_SOURCE_PAGE_MAX);
}

function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

export function newSubmissionId(): string {
  return crypto.randomUUID();
}

export function sourcePageFromLocation(
  pathname: string,
  baseUrl = "/",
): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  let path = pathname || "/";
  if (normalizedBase && path.startsWith(normalizedBase)) {
    path = path.slice(normalizedBase.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  const withoutTrailing =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return clipSourcePage(withoutTrailing) ?? "/";
}

export function buildLeadRequest(input: LeadPayloadInput): LeadRequestBody {
  const shared: Omit<LeadRequestBody, "formType" | "message" | "feature"> = {
    sourceSite: LEAD_SOURCE_SITE,
    sourcePage: clipSourcePage(input.sourcePage ?? ""),
    submissionId: input.submissionId.trim(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: present(input.company),
    phone: present(input.phone),
    consent: true,
    consentTextVersion: LEAD_CONSENT_TEXT_VERSION,
    marketingOptIn: input.marketingOptIn,
    turnstileToken: input.turnstileToken.trim(),
    website: present(input.website),
    product: LEAD_PRODUCT,
  };

  switch (input.formType) {
    case "contact":
      return omitUndefined({
        ...shared,
        formType: "contact",
        message: contactMessage(input.message ?? "", input.role),
      });
    case "waitlist":
      return omitUndefined({
        ...shared,
        formType: "waitlist",
        feature: LEAD_WAITLIST_FEATURE,
        message: present(input.message),
      });
    default: {
      const exhaustive: never = input.formType;
      return exhaustive;
    }
  }
}

export function leadRequestBytes(body: LeadRequestBody): number {
  return new TextEncoder().encode(JSON.stringify(body)).length;
}

type LeadErrorBody = {
  error?: unknown;
  details?: unknown;
  message?: unknown;
  fields?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function fieldLabels(paths: string[]): string[] {
  return paths.map((path) => FIELD_LABELS[path] ?? path);
}

export function parseLeadErrorBody(data: unknown): {
  code: string;
  fields: string[];
} {
  if (!data || typeof data !== "object") {
    return { code: "", fields: [] };
  }
  const record = data as LeadErrorBody;
  const code = typeof record.error === "string" ? record.error : "";
  const fields = [
    ...asStringArray(record.details),
    ...asStringArray(record.fields),
  ];
  return { code, fields };
}

function validationMessage(fields: string[]): string {
  const labels = fieldLabels(fields);
  if (labels.length === 0) {
    return "Please check the highlighted fields and try again.";
  }
  return `Please check: ${labels.join(", ")}.`;
}

export function mapLeadHttpError(
  status: number,
  data: unknown,
): LeadSubmitFailure {
  const { code, fields } = parseLeadErrorBody(data);

  if (status === 400) {
    return {
      ok: false,
      kind: "validation",
      message: validationMessage(fields),
      fields,
    };
  }

  if (status === 404 && code === "function_disabled") {
    return {
      ok: false,
      kind: "unavailable",
      message:
        "Lead intake is temporarily unavailable. Please try again later.",
      fields: [],
    };
  }

  if (status === 403 || status === 429 || status >= 500) {
    return {
      ok: false,
      kind: "retry",
      message: "We could not send your request. Please try again shortly.",
      fields: [],
    };
  }

  if (status === 404) {
    return {
      ok: false,
      kind: "unavailable",
      message:
        "Lead intake is temporarily unavailable. Please try again later.",
      fields: [],
    };
  }

  return {
    ok: false,
    kind: "retry",
    message: "We could not send your request. Please try again shortly.",
    fields: [],
  };
}

export async function submitLeadRequest(
  body: LeadRequestBody,
  fetchImpl: typeof fetch = fetch,
): Promise<LeadSubmitResult> {
  if (leadRequestBytes(body) > LEAD_BODY_MAX_BYTES) {
    return {
      ok: false,
      kind: "validation",
      message: "Please shorten the message and try again.",
      fields: ["message"],
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchImpl(LEAD_INTAKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    let data: unknown = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (response.status === 202) {
      const id =
        data &&
        typeof data === "object" &&
        "id" in data &&
        typeof data.id === "string"
          ? data.id
          : body.submissionId;
      return { ok: true, id };
    }

    return mapLeadHttpError(response.status, data);
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      kind: "unavailable",
      message: timedOut
        ? "Lead intake is temporarily unavailable. Please try again later."
        : "We could not reach the server. Check your connection and try again.",
      fields: [],
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
