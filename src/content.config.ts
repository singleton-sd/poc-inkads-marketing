import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { footerNav, primaryNav } from "./lib/nav";

/** Site-nav paths only — rejects javascript:, data:, and other schemes. */
const approvedInternalRoutes = Array.from(
  new Set([
    "/",
    ...primaryNav.map((item) => item.href),
    ...Object.values(footerNav).flatMap((group) =>
      group.map((item) => item.href),
    ),
  ]),
) as [string, ...string[]];

const ctaLink = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const benefitSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const placeCardSchema = z.object({
  index: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  featured: z.boolean().optional(),
  tag: z.string().optional(),
});

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    headline: z.string().min(1),
    summary: z.string().min(1),
    eyebrow: z.string().min(1).optional(),
    email: z.email().optional(),
    status: z.string().min(1).optional(),
    submitLabel: z.string().min(1).optional(),
    successTitle: z.string().min(1).optional(),
    successBody: z.string().min(1).optional(),
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
    draft: z.boolean().default(false),
    steps: z
      .array(
        z.object({
          number: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
        }),
      )
      .optional(),
    featuresEyebrow: z.string().min(1).optional(),
    featuresHeadline: z.string().min(1).optional(),
    features: z
      .array(
        z.object({
          title: z.string().min(1),
          description: z.string().min(1),
        }),
      )
      .optional(),
    ctaTitle: z.string().min(1).optional(),
    primaryCta: ctaLink.optional(),
    secondaryCta: ctaLink.optional(),
    places: z.array(placeCardSchema).optional(),
    constraint: z
      .object({
        eyebrow: z.string().min(1),
        headline: z.string().min(1),
        body: z.string().min(1),
        mediaLabel: z.string().min(1),
      })
      .optional(),
    cta: z
      .object({
        title: z.string().min(1),
        label: z.string().min(1),
      })
      .optional(),
    ctaLabel: z.string().min(1).optional(),
    mediaLabel: z.string().min(1).optional(),
    benefitsEyebrow: z.string().min(1).optional(),
    benefits: z.array(benefitSchema).optional(),
    designingEyebrow: z.string().min(1).optional(),
    designingHeadline: z.string().min(1).optional(),
    designingBody: z.string().min(1).optional(),
    closingHeadline: z.string().min(1).optional(),
  }),
});

const legal = defineCollection({
  loader: glob({ base: "./src/content/legal", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    effectiveDate: z.coerce.date(),
    draft: z.boolean().default(true),
  }),
});

export const collections = { legal, pages };
