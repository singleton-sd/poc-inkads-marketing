export const primaryNav = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Use cases", href: "/places" },
  { label: "Venues", href: "/venues" },
  { label: "Advertisers", href: "/advertisers" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
] as const;

export const footerNav = {
  Product: [
    { label: "How it works", href: "/how-it-works" },
    { label: "Use cases", href: "/places" },
    { label: "Pricing", href: "/pricing" },
  ],
  Audiences: [
    { label: "For venues", href: "/venues" },
    { label: "For advertisers", href: "/advertisers" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Support", href: "/support" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

/**
 * Prefix an internal path with Astro's `BASE_URL` (e.g. `/` or `/preview/`).
 * External, hash, and mailto links are returned unchanged.
 */
export function withBase(path: string, base: string): string {
  if (
    path.startsWith("http") ||
    path.startsWith("#") ||
    path.startsWith("mailto:")
  ) {
    return path;
  }
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (path === "/") return `${normalizedBase}/`;
  return `${normalizedBase}${path}`;
}

/**
 * Whether `pathname` matches a nav `href` after base-path normalization.
 * Home links compare equality only so a root `base` of `/` cannot match every route.
 */
export function isActivePath(
  pathname: string,
  href: string,
  base: string,
): boolean {
  const current = pathname.replace(/\/$/, "") || "/";
  const target = withBase(href, base).replace(/\/$/, "") || "/";
  if (href === "/") {
    return current === target;
  }
  return current === target || current.endsWith(href);
}
