import { z } from "astro/zod";

import {
  ctaLink,
  draftField,
  featureItem,
  internalRoute,
  pageSeo,
  processStep,
} from "./shared.ts";

const marketingShared = {
  eyebrow: z.string().trim().min(1).optional(),
  /** Optional nav chrome label; required when showInHeader or showInFooter. */
  navLabel: z.string().trim().min(1).optional(),
  /** Opt-in: append to primary header nav (default hidden). */
  showInHeader: z.boolean().default(false),
  /** Opt-in: append to footer Company column (default hidden). */
  showInFooter: z.boolean().default(false),
  draft: draftField,
};

export const proseMarketingSchema = pageSeo
  .extend({
    template: z.literal("prose"),
    ...marketingShared,
    ctaLabel: z.string().trim().min(1).optional(),
    ctaHref: internalRoute.optional(),
    /** Optional CtaBand title; falls back to headline when omitted. */
    closingTitle: z.string().trim().min(1).optional(),
  })
  .strict();

export const ctaHeavyMarketingSchema = pageSeo
  .extend({
    template: z.literal("cta-heavy"),
    ...marketingShared,
    primaryCta: ctaLink,
    secondaryCta: ctaLink.optional(),
    ctaTitle: z.string().trim().min(1),
  })
  .strict();

export const landingBandMarketingSchema = pageSeo
  .extend({
    template: z.literal("landing-band"),
    ...marketingShared,
    columns: z
      .array(
        z.object({
          title: z.string().trim().min(1),
          body: z.string().trim().min(1),
        }),
      )
      .min(1),
    statement: z.string().trim().min(1),
    ctaTitle: z.string().trim().min(1),
    primaryCta: ctaLink,
    secondaryCta: ctaLink,
  })
  .strict();

export const audienceLandingMarketingSchema = pageSeo
  .extend({
    template: z.literal("audience-landing"),
    ...marketingShared,
    ctaLabel: z.string().trim().min(1),
    ctaHref: internalRoute,
    mediaLabel: z.string().trim().min(1),
    benefitsEyebrow: z.string().trim().min(1),
    benefits: z.array(featureItem).min(1),
    processEyebrow: z.string().trim().min(1),
    processHeadline: z.string().trim().min(1),
    process: z.array(processStep).min(1),
    closingHeadline: z.string().trim().min(1),
  })
  .strict();

export const marketingTemplates = [
  "prose",
  "cta-heavy",
  "landing-band",
  "audience-landing",
] as const;

export type MarketingTemplate = (typeof marketingTemplates)[number];

export const marketingPageSchema = z
  .discriminatedUnion("template", [
    proseMarketingSchema,
    ctaHeavyMarketingSchema,
    landingBandMarketingSchema,
    audienceLandingMarketingSchema,
  ])
  .superRefine((data, ctx) => {
    if (
      data.template === "prose" &&
      Boolean(data.ctaLabel) !== Boolean(data.ctaHref)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "ctaLabel and ctaHref must be provided together",
        path: ["ctaHref"],
      });
    }

    if ((data.showInHeader || data.showInFooter) && !data.navLabel) {
      ctx.addIssue({
        code: "custom",
        message:
          "navLabel is required when showInHeader or showInFooter is enabled",
        path: ["navLabel"],
      });
    }
  });
