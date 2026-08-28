import { z } from "astro/zod";

import { draftField, featureItem, pageSeo, processStep } from "./shared";

export const venuesPageSchema = pageSeo.extend({
  template: z.literal("venues"),
  eyebrow: z.string().min(1),
  ctaLabel: z.string().min(1),
  ctaHref: z.string().min(1),
  mediaLabel: z.string().min(1),
  benefitsEyebrow: z.string().min(1),
  benefits: z.array(featureItem).min(1),
  processEyebrow: z.string().min(1),
  processHeadline: z.string().min(1),
  process: z.array(processStep).min(1),
  closingHeadline: z.string().min(1),
  draft: draftField,
});
