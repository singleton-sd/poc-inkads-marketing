import { discoverMarketingInternalRoutes } from "./marketing-routes.ts";
import { footerNav, primaryNav } from "./nav.ts";

/** Root-relative single-slash paths only, so a nav entry cannot widen the enum. */
const isInternalRoute = (href: string) => /^\/(?!\/)/.test(href);

/**
 * Site-nav paths plus published marketing collection URLs — rejects javascript:,
 * data:, and other schemes. Marketing slugs are discovered at build time so CTAs
 * can link peer marketing pages without waiting for nav opt-in.
 */
export const approvedInternalRoutes = Array.from(
  new Set(
    [
      "/",
      ...primaryNav.map((item) => item.href),
      ...Object.values(footerNav).flatMap((group) =>
        group.map((item) => item.href),
      ),
      ...discoverMarketingInternalRoutes(),
    ].filter(isInternalRoute),
  ),
) as [string, ...string[]];
