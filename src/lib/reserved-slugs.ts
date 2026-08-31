/** Slugs owned by fixed `src/pages/*.astro` routes (not the dynamic marketing route). */
export const RESERVED_PAGE_SLUGS = [
  "about",
  "advertisers",
  "contact",
  "faq",
  "how-it-works",
  "places",
  "pricing",
  "support",
  "venues",
] as const;

const RESERVED_SET = new Set<string>([
  ...RESERVED_PAGE_SLUGS,
  "index",
  "404",
  "admin",
]);

/** Slug safe for URLs and markdown filenames (lowercase kebab segments). */
export const MARKETING_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Returns true when the slug is owned by a fixed route or reserved system path. */
export function isReservedPageSlug(slug: string): boolean {
  return RESERVED_SET.has(slug);
}

/** Returns true when the slug matches lowercase kebab-case URL rules. */
export function isValidMarketingSlug(slug: string): boolean {
  return MARKETING_SLUG_PATTERN.test(slug);
}
