import { z } from "zod";

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

/** Role option → PostKit contact `subject` (opportunity type, not lead source). */
export const ROLE_TO_SUBJECT: Record<ContactRole, string> = {
  "Venue owner / operator": "partnership",
  "Advertiser / brand": "sales",
  Other: "general",
};

export const ROLE_OPTION_VALUES = new Set<string>(CONTACT_ROLE_OPTIONS);

/** System-assigned lead source; never collected as a form field. */
export const CONTACT_FORM_SOURCE = "InkAds contact form";

/**
 * Align with PostKit `validateContactInquiry` (post-kit-email):
 * name ≤ 120, email ≤ 254, message 10–5000. Phone is not a PostKit field yet.
 */
export const SAFE_NAME_MAX = 120;
export const SAFE_EMAIL_MAX = 254;
export const SAFE_PHONE_MAX = 40;
export const SAFE_COMPANY_MAX = 200;
export const POSTKIT_MESSAGE_MIN = 10;
export const POSTKIT_MESSAGE_MAX = 5000;
const MESSAGE_METADATA_BUDGET =
  `Venue / company: `.length +
  SAFE_COMPANY_MAX +
  1 +
  `Phone: `.length +
  SAFE_PHONE_MAX +
  1 +
  `Source: ${CONTACT_FORM_SOURCE}`.length +
  2;
export const SAFE_MESSAGE_MAX = POSTKIT_MESSAGE_MAX - MESSAGE_METADATA_BUDGET;

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

/** URL-synced subset (company / phone / message never appear here). */
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

export const contactFormFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(SAFE_NAME_MAX, `Name must be at most ${SAFE_NAME_MAX} characters.`)
    .refine(
      (value) => !CONTROL_CHARS_RE.test(value),
      "Name contains invalid characters.",
    ),
  company: optionalPlainText(SAFE_COMPANY_MAX, "Venue / company"),
  phone: optionalPlainText(SAFE_PHONE_MAX, "Phone"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(SAFE_EMAIL_MAX, `Email must be at most ${SAFE_EMAIL_MAX} characters.`)
    .regex(SAFE_EMAIL_RE, "Enter a valid email address."),
  role: z.union([z.enum(CONTACT_ROLE_OPTIONS), z.literal("")]),
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(
      SAFE_MESSAGE_MAX,
      `Message must be at most ${SAFE_MESSAGE_MAX} characters.`,
    ),
});

export type ContactFormValues = z.infer<typeof contactFormFieldsSchema>;

/** Fold optional fields PostKit does not accept into the message body. */
export function buildContactMessagePayload(
  values: Pick<ContactFormValues, "company" | "phone" | "message">,
): string {
  const lines: string[] = [];
  const company = values.company.trim();
  const phone = values.phone.trim();
  if (company) lines.push(`Venue / company: ${company}`);
  if (phone) lines.push(`Phone: ${phone}`);
  lines.push(`Source: ${CONTACT_FORM_SOURCE}`);
  lines.push("");
  lines.push(values.message.trim());
  return lines.join("\n");
}

export const contactFormSchema = contactFormFieldsSchema;

/** Form default values (role may be "" until the user selects). */
export type ContactFormDefaultValues = ContactFormValues;

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

/** Map role to PostKit subject. Unset role defaults to general, not a source. */
export function subjectFromRole(role: ContactRole | ""): string {
  switch (role) {
    case "Venue owner / operator":
      return ROLE_TO_SUBJECT[role];
    case "Advertiser / brand":
      return ROLE_TO_SUBJECT[role];
    case "Other":
      return ROLE_TO_SUBJECT[role];
    case "":
      return "general";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
