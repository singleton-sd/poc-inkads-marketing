import { z } from "astro/zod";

import { draftField, internalRoute, pageSeo } from "./shared";

export const marketingPageSchema = pageSeo.extend({
  eyebrow: z.string().trim().min(1).optional(),
  ctaLabel: z.string().trim().min(1).optional(),
  ctaHref: internalRoute.optional(),
  draft: draftField,
});
