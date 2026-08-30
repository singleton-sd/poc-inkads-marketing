import { z } from "astro/zod";

import { draftField, pageSeo, placeCard } from "./shared";

export const placesPageSchema = pageSeo.extend({
  template: z.literal("places"),
  eyebrow: z.string().min(1).optional(),
  places: z.array(placeCard).min(1),
  constraint: z.object({
    eyebrow: z.string().min(1),
    headline: z.string().min(1),
    body: z.string().min(1),
    mediaLabel: z.string().min(1),
  }),
  cta: z.object({
    title: z.string().min(1),
    label: z.string().min(1),
  }),
  draft: draftField,
});
