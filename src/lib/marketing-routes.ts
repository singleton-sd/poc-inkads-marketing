import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { isDraftFrontmatter } from "./draft-frontmatter.mjs";
import { isReservedPageSlug, isValidMarketingSlug } from "./reserved-slugs.ts";

const marketingDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../content/marketing",
);

export { isDraftFrontmatter };

/**
 * Build-time scan of marketing markdown slugs for CTA allowlisting.
 * Includes non-draft pages only so peer CTAs can target published marketing URLs
 * even when those pages stay hidden from header/footer nav.
 */
export function discoverMarketingInternalRoutes(): string[] {
  let files: string[];
  try {
    files = readdirSync(marketingDir);
  } catch {
    return [];
  }

  const routes: string[] = [];
  for (const file of files) {
    if (!/\.(md|mdx)$/.test(file)) continue;
    const slug = file.replace(/\.(md|mdx)$/, "");
    if (!isValidMarketingSlug(slug) || isReservedPageSlug(slug)) continue;
    const raw = readFileSync(join(marketingDir, file), "utf8");
    if (isDraftFrontmatter(raw)) continue;
    routes.push(`/${slug}`);
  }

  return routes.sort();
}
