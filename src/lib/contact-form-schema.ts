import { z } from "zod";
import {
  LEAD_COMPANY_MAX,
  LEAD_EMAIL_MAX,
  LEAD_MESSAGE_MAX,
  LEAD_NAME_MAX,
  LEAD_PHONE_MAX,
  LEAD_WEBSITE_MAX,
} from "./lead-intake.ts";

/** Select option labels (also used as form values). */
export const CONTACT_ROLE_OPTIONS = [
  "Venue owner / operator",
  "Advertiser / brand",
  "Other",
] as const;

export type ContactRole = (typeof CONTACT_ROLE_OPTIONS)[number];

/** Query `role` aliases → select option labels. */
export const ROLE_QUERY_TO_OPTION: Record<string, ContactRole> = {
  venue: "Venue owner / operator",
  partnership: "Venue owner / operator",
  advertiser: "Advertiser / brand",
  sales: "Advertiser / brand",
  other: "Other",
  general: "Other",
};

/** Option labels → short query aliases written back to the URL. */
export const ROLE_OPTION_TO_QUERY: Record<ContactRole, string> = {
  "Venue owner / operator": "venue",
  "Advertiser / brand": "advertiser",
  Other: "other",
};

export const ROLE_OPTION_VALUES = new Set<string>(CONTACT_ROLE_OPTIONS);

export const SAFE_NAME_MAX = LEAD_NAME_MAX;
export const SAFE_EMAIL_MAX = LEAD_EMAIL_MAX;
export const SAFE_COMPANY_MAX = LEAD_COMPANY_MAX;
export const SAFE_PHONE_MAX = LEAD_PHONE_MAX;
export const SAFE_MESSAGE_MAX = LEAD_MESSAGE_MAX;
export const SAFE_WEBSITE_MAX = LEAD_WEBSITE_MAX;

// Reject whitespace, @, and C0/DEL controls in each segment (blocks %00 etc.).
export const SAFE_EMAIL_RE =
  /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/;

const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;

export function resolveRoleOption(raw: string | null): ContactRole | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const byAlias = ROLE_QUERY_TO_OPTION[trimmed.toLowerCase()];
  if (byAlias) return byAlias;
  if (ROLE_OPTION_VALUES.has(trimmed)) return trimmed as ContactRole;
  return null;
}

export function isSafeName(raw: string): boolean {
  return (
    raw.length > 0 && raw.length <= SAFE_NAME_MAX && !CONTROL_CHARS_RE.test(raw)
  );
}

export function isSafeEmail(raw: string): boolean {
  return (
    raw.length > 0 && raw.length <= SAFE_EMAIL_MAX && SAFE_EMAIL_RE.test(raw)
  );
}

/** Inbound query → name (invalid/absent → ""). */
export const contactQueryNameSchema = z.preprocess((raw) => {
  if (typeof raw !== "string") return "";
  return raw.trim();
}, z.string().refine(isSafeName).catch(""));

/** Inbound query → email (invalid/absent → ""). */
export const contactQueryEmailSchema = z.preprocess((raw) => {
  if (typeof raw !== "string") return "";
  return raw.trim();
}, z.string().refine(isSafeEmail).catch(""));

/** Inbound query → role label (invalid/absent → ""). */
export const contactQueryRoleSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "string") return "";
    return resolveRoleOption(raw) ?? "";
  },
  z.union([z.enum(CONTACT_ROLE_OPTIONS), z.literal("")]),
);

/** URL-synced subset (company/phone/message/consent never appear here). */
export const contactFormQuerySchema = z.object({
  name: contactQueryNameSchema,
  email: contactQueryEmailSchema,
  role: contactQueryRoleSchema,
});

export type ContactFormQueryValues = z.infer<typeof contactFormQuerySchema>;

const optionalPlainText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .refine(
      (value) => !CONTROL_CHARS_RE.test(value),
      `${label} contains invalid characters.`,
    );

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(SAFE_NAME_MAX, `Name must be at most ${SAFE_NAME_MAX} characters.`)
    .refine(
      (value) => !CONTROL_CHARS_RE.test(value),
      "Name contains invalid characters.",
    ),
  company: z
    .string()
    .trim()
    .min(1, "Venue / company is required.")
    .max(
      SAFE_COMPANY_MAX,
      `Venue / company must be at most ${SAFE_COMPANY_MAX} characters.`,
    )
    .refine(
      (value) => !CONTROL_CHARS_RE.test(value),
      "Venue / company contains invalid characters.",
    ),
  phone: optionalPlainText(SAFE_PHONE_MAX, "Phone"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(SAFE_EMAIL_MAX, `Email must be at most ${SAFE_EMAIL_MAX} characters.`)
    .regex(SAFE_EMAIL_RE, "Enter a valid email address."),
  role: z.enum(CONTACT_ROLE_OPTIONS, {
    error: "Select an option.",
  }),
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(
      SAFE_MESSAGE_MAX,
      `Message must be at most ${SAFE_MESSAGE_MAX} characters.`,
    ),
  consent: z.literal(true, {
    error: "Please confirm you have read the privacy policy.",
  }),
  marketingOptIn: z.boolean(),
  website: optionalPlainText(SAFE_WEBSITE_MAX, "Website"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

/** Form default values (role may be "" until the user selects). */
export type ContactFormDefaultValues = Omit<
  ContactFormValues,
  "role" | "consent"
> & {
  role: ContactRole | "";
  consent: boolean;
};

export function parseNameFromQuery(raw: string | null): string {
  const result = contactQueryNameSchema.safeParse(raw ?? "");
  return result.success ? result.data : "";
}

export function parseEmailFromQuery(raw: string | null): string {
  const result = contactQueryEmailSchema.safeParse(raw ?? "");
  return result.success ? result.data : "";
}

export function serializeRoleQuery(value: string): string | null {
  if (!value) return null;
  return ROLE_OPTION_TO_QUERY[value as ContactRole] ?? null;
}

export function serializeNameQuery(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isSafeName(trimmed) ? trimmed : null;
}

export function serializeEmailQuery(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isSafeEmail(trimmed) ? trimmed : null;
}

/** Outbound serializers for `useZodFormQuerySync` (null clears the param). */
export const contactFormQuerySerializers: {
  [K in keyof ContactFormQueryValues]: (
    value: ContactFormQueryValues[K],
  ) => string | null;
} = {
  name: serializeNameQuery,
  email: serializeEmailQuery,
  role: serializeRoleQuery,
};
