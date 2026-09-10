export type NavItem = {
  label: string;
  href: string;
};

export const primaryNav = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Use cases", href: "/places" },
  { label: "Venues", href: "/venues" },
  { label: "Advertisers", href: "/advertisers" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
] as const satisfies readonly NavItem[];

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
} as const satisfies Record<string, readonly NavItem[]>;

export type FooterNav = {
  [K in keyof typeof footerNav]: NavItem[];
} & Record<string, NavItem[]>;

/** Narrow shape used when merging CMS marketing pages into site nav. */
export type MarketingNavSource = {
  id: string;
  data: {
    draft?: boolean;
    navLabel?: string;
    showInHeader?: boolean;
    showInFooter?: boolean;
  };
};

function marketingNavItem(entry: MarketingNavSource): NavItem | null {
  if (entry.data.draft) return null;
  const label = entry.data.navLabel?.trim();
  if (!label) return null;
  return { label, href: `/${entry.id}` };
}

/**
 * Core primary nav plus opt-in marketing pages (`showInHeader`), appended and
 * sorted by label. Hardcoded core links are never replaced.
 */
export function mergePrimaryNav(
  core: readonly NavItem[],
  entries: readonly MarketingNavSource[],
): NavItem[] {
  const extras = entries
    .filter((entry) => entry.data.showInHeader)
    .map(marketingNavItem)
    .filter((item): item is NavItem => item !== null)
    .sort((a, b) => a.label.localeCompare(b.label));

  return [...core, ...extras];
}

/**
 * Core footer columns plus opt-in marketing pages (`showInFooter`) appended to
 * the Company column. Hardcoded core links are never replaced.
 */
export function mergeFooterNav(
  core: typeof footerNav,
  entries: readonly MarketingNavSource[],
): FooterNav {
  const result: FooterNav = {
    Product: [...core.Product],
    Audiences: [...core.Audiences],
    Company: [...core.Company],
  };

  const extras = entries
    .filter((entry) => entry.data.showInFooter)
    .map(marketingNavItem)
    .filter((item): item is NavItem => item !== null)
    .sort((a, b) => a.label.localeCompare(b.label));

  result.Company.push(...extras);
  return result;
}

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
