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

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    headline: z.string().min(1),
    summary: z.string().min(1),
    eyebrow: z.string().min(1).optional(),
    ctaTitle: z.string().min(1).optional(),
    ctaLabel: z.string().min(1).optional(),
    ctaHref: z.string().min(1).optional(),
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
    primaryCta: ctaLink.optional(),
    secondaryCta: ctaLink.optional(),
  }),
});

const faqs = defineCollection({
  loader: glob({ base: "./src/content/faqs", pattern: "**/*.{md,mdx}" }),
  schema: z
    .object({
      question: z.string().min(1),
      answer: z.string().min(1),
      order: z.number().int().nonnegative(),
      link: z
        .object({
          label: z.string().min(1),
          href: z.string().min(1),
        })
        .optional(),
      draft: z.boolean().default(false),
    })
    // FaqItem only renders the anchor around a label found in the answer, so a
    // label that never appears would silently drop the link.
    .refine((entry) => !entry.link || entry.answer.includes(entry.link.label), {
      message: "link.label must appear in answer so the anchor can render",
      path: ["link", "label"],
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

export const collections = { faqs, legal, pages };
