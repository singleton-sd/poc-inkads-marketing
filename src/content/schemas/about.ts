import { z } from "astro/zod";

import { ctaLink, draftField, pageSeo } from "./shared";

export const aboutPageSchema = pageSeo.extend({
  template: z.literal("about"),
  eyebrow: z.string().min(1).optional(),
  columns: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .min(1),
  parentBrand: z.string().min(1),
  ctaTitle: z.string().min(1),
  primaryCta: ctaLink,
  secondaryCta: ctaLink,
  draft: draftField,
});
