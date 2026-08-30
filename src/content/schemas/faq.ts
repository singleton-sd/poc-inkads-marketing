import { z } from "astro/zod";

import { draftField, internalRoute, pageSeo } from "./shared";

export const faqPageSchema = pageSeo.extend({
  template: z.literal("faq"),
  eyebrow: z.string().min(1).optional(),
  ctaTitle: z.string().min(1).optional(),
  ctaLabel: z.string().min(1).optional(),
  ctaHref: internalRoute.optional(),
  draft: draftField,
});
