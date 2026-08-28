import { footerNav, primaryNav } from "./nav.ts";

/** Root-relative single-slash paths only, so a nav entry cannot widen the enum. */
const isInternalRoute = (href: string) => /^\/(?!\/)/.test(href);

/** Site-nav paths only — rejects javascript:, data:, and other schemes. */
export const approvedInternalRoutes = Array.from(
  new Set(
    [
      "/",
      ...primaryNav.map((item) => item.href),
      ...Object.values(footerNav).flatMap((group) =>
        group.map((item) => item.href),
      ),
    ].filter(isInternalRoute),
  ),
) as [string, ...string[]];
