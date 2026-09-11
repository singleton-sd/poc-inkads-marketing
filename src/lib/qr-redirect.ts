import { approvedInternalRoutes } from "./approved-internal-routes.ts";

/** Public path house-ad QR codes encode (stable; change target in content). */
export const QR_REDIRECT_PATH = "/go";

/**
 * Default destination for `/go`. Prefills the contact form as a venue inquiry
 * when contact query prefill is available; otherwise the query is ignored.
 */
export const DEFAULT_QR_REDIRECT_TARGET = "/contact?role=venue";

/** Same-origin base used only to parse relative targets safely. */
const PARSE_ORIGIN = "https://inkads.poc.singletonsd.com";

const approvedPathnames = new Set(approvedInternalRoutes);

function normalizePathname(pathname: string): string {
  if (pathname === "/" || pathname === "") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

/**
 * Returns a normalized root-relative target when `target` is a same-host path
 * (optional query/hash) whose pathname is on the internal allowlist. Rejects
 * absolute URLs, protocol-relative hosts, and other open-redirect vectors.
 */
export function normalizeSafeQrRedirectTarget(target: string): string | null {
  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\0-\x1f\s\\]/.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed, PARSE_ORIGIN);
  } catch {
    return null;
  }

  if (url.origin !== PARSE_ORIGIN) return null;
  if (url.username || url.password) return null;

  const pathname = normalizePathname(url.pathname);
  if (!approvedPathnames.has(pathname)) return null;

  return `${pathname}${url.search}${url.hash}`;
}

/** Returns true when {@link normalizeSafeQrRedirectTarget} accepts `target`. */
export function isSafeQrRedirectTarget(target: string): boolean {
  return normalizeSafeQrRedirectTarget(target) !== null;
}

/** Throws when `target` fails open-redirect checks; otherwise returns normalized form. */
export function assertSafeQrRedirectTarget(target: string): string {
  const normalized = normalizeSafeQrRedirectTarget(target);
  if (!normalized) {
    throw new Error(
      `Invalid QR redirect target "${target}". Use a root-relative allowlisted path only (e.g. ${DEFAULT_QR_REDIRECT_TARGET}).`,
    );
  }
  return normalized;
}
