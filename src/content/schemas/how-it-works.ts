import { z } from "astro/zod";

import { ctaLink, draftField, featureItem, pageSeo } from "./shared";

export const howItWorksPageSchema = pageSeo.extend({
  template: z.literal("how-it-works"),
  eyebrow: z.string().min(1),
  steps: z
    .array(
      z.object({
        number: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1),
  featuresEyebrow: z.string().min(1),
  featuresHeadline: z.string().min(1),
  features: z.array(featureItem).min(1),
  ctaTitle: z.string().min(1),
  primaryCta: ctaLink,
  secondaryCta: ctaLink,
  draft: draftField,
});
