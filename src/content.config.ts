import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const benefitSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    headline: z.string().min(1),
    summary: z.string().min(1),
    eyebrow: z.string().optional(),
    ctaLabel: z.string().optional(),
    mediaLabel: z.string().optional(),
    benefitsEyebrow: z.string().optional(),
    benefits: z.array(benefitSchema).optional(),
    designingEyebrow: z.string().optional(),
    designingHeadline: z.string().optional(),
    designingBody: z.string().optional(),
    closingHeadline: z.string().optional(),
    draft: z.boolean().default(false),
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
