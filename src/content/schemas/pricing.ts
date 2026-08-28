import { z } from "astro/zod";

import { approvedInternalRoutes, draftField, pageSeo } from "./shared";

export const pricingPageSchema = pageSeo.extend({
  template: z.literal("pricing"),
  eyebrow: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  pilots: z
    .array(
      z.object({
        eyebrow: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        ctaLabel: z.string().min(1),
        href: z.enum(approvedInternalRoutes),
        accent: z.enum(["brand", "audience"]).default("brand"),
      }),
    )
    .optional(),
  draft: draftField,
});
