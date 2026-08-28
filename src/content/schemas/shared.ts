import { z } from "astro/zod";

import { footerNav, primaryNav } from "../../lib/nav";

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

export const ctaLink = z.object({
  label: z.string().trim().min(1),
  href: z.string().trim().min(1),
});

export const featureItem = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const processStep = z.object({
  label: z.string().trim().min(1),
  detail: z.string().trim().min(1),
});

export const placeCard = z.object({
  index: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  featured: z.boolean().optional(),
  tag: z.string().optional(),
});

export const pageSeo = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  headline: z.string().min(1),
  summary: z.string().min(1),
});

export const draftField = z.boolean().default(false);
