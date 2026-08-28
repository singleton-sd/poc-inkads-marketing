import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { aboutPageSchema } from "./content/schemas/about";
import { advertisersPageSchema } from "./content/schemas/advertisers";
import { contactPageSchema } from "./content/schemas/contact";
import { faqPageSchema } from "./content/schemas/faq";
import { homePageSchema } from "./content/schemas/home";
import { howItWorksPageSchema } from "./content/schemas/how-it-works";
import { placesPageSchema } from "./content/schemas/places";
import { pricingPageSchema } from "./content/schemas/pricing";
import { supportPageSchema } from "./content/schemas/support";
import { venuesPageSchema } from "./content/schemas/venues";

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.discriminatedUnion("template", [
    aboutPageSchema,
    advertisersPageSchema,
    contactPageSchema,
    faqPageSchema,
    homePageSchema,
    howItWorksPageSchema,
    placesPageSchema,
    pricingPageSchema,
    supportPageSchema,
    venuesPageSchema,
  ]),
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
