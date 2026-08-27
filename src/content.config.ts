import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const ctaLink = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
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
