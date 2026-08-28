import { z } from "astro/zod";

import { draftField, featureItem, pageSeo } from "./shared";

export const advertisersPageSchema = pageSeo.extend({
  template: z.literal("advertisers"),
  eyebrow: z.string().min(1).optional(),
  ctaLabel: z.string().min(1).optional(),
  mediaLabel: z.string().min(1).optional(),
  benefitsEyebrow: z.string().min(1).optional(),
  benefits: z.array(featureItem).optional(),
  designingEyebrow: z.string().min(1).optional(),
  designingHeadline: z.string().min(1),
  designingBody: z.string().min(1),
  closingHeadline: z.string().min(1),
  draft: draftField,
});
