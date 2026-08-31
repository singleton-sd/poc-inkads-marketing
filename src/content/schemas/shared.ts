import { z } from "astro/zod";

import { approvedInternalRoutes } from "../../lib/approved-internal-routes";

export { approvedInternalRoutes };

export const internalRoute = z.enum(approvedInternalRoutes);

export const ctaLink = z.object({
  label: z.string().trim().min(1),
  href: internalRoute,
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
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  summary: z.string().trim().min(1),
});

export const draftField = z.boolean().default(false);
