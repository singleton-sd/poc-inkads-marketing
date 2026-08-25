import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const featureItem = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const processStep = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
});

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    headline: z.string().min(1),
    summary: z.string().min(1),
    draft: z.boolean().default(false),
    eyebrow: z.string().min(1).optional(),
    ctaLabel: z.string().min(1).optional(),
    ctaHref: z.string().min(1).optional(),
    mediaLabel: z.string().min(1).optional(),
    benefitsEyebrow: z.string().min(1).optional(),
    benefits: z.array(featureItem).optional(),
    processEyebrow: z.string().min(1).optional(),
    processHeadline: z.string().min(1).optional(),
    process: z.array(processStep).optional(),
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
