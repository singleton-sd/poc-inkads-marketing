/** Query `role` aliases → select option labels (same mapping as submit subjects). */
export const ROLE_QUERY_TO_OPTION: Record<string, string> = {
  venue: "Venue owner / operator",
  partnership: "Venue owner / operator",
  advertiser: "Advertiser / brand",
  sales: "Advertiser / brand",
  other: "Other",
  general: "Other",
};

/** Option labels → short query aliases written back to the URL. */
export const ROLE_OPTION_TO_QUERY: Record<string, string> = {
  "Venue owner / operator": "venue",
  "Advertiser / brand": "advertiser",
  Other: "other",
};

export const ROLE_OPTION_VALUES = new Set(Object.values(ROLE_QUERY_TO_OPTION));

export const SAFE_NAME_MAX = 200;
export const SAFE_EMAIL_MAX = 254;

// Reject whitespace, @, and C0/DEL controls in each segment (blocks %00 etc.).
export const SAFE_EMAIL_RE =
  /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/;

export function resolveRoleOption(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const byAlias = ROLE_QUERY_TO_OPTION[trimmed.toLowerCase()];
  if (byAlias) return byAlias;
  if (ROLE_OPTION_VALUES.has(trimmed)) return trimmed;
  return null;
}

export function isSafeName(raw: string): boolean {
  return (
    raw.length > 0 &&
    raw.length <= SAFE_NAME_MAX &&
    !/[\u0000-\u001f\u007f]/.test(raw)
  );
}

export function isSafeEmail(raw: string): boolean {
  return (
    raw.length > 0 && raw.length <= SAFE_EMAIL_MAX && SAFE_EMAIL_RE.test(raw)
  );
}

export function parseNameFromQuery(raw: string | null): string {
  const trimmed = raw?.trim() ?? "";
  return isSafeName(trimmed) ? trimmed : "";
}

export function parseEmailFromQuery(raw: string | null): string {
  const trimmed = raw?.trim() ?? "";
  return isSafeEmail(trimmed) ? trimmed : "";
}

export type QueryParamSerializer = (value: string) => string | null;

/** Serialize a form field value for the URL (null deletes the param). */
export function serializeRoleQuery(value: string): string | null {
  return ROLE_OPTION_TO_QUERY[value] ?? null;
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

export function replaceUrlSearchParam(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value == null || value === "") url.searchParams.delete(key);
  else url.searchParams.set(key, value);

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    history.replaceState(history.state, "", next);
  }
}

export function readSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}
