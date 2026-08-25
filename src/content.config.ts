import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

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
    eyebrow: z.string().optional(),
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
