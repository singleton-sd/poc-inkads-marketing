import { z } from "astro/zod";

import { draftField, pageSeo } from "./shared";

export const contactPageSchema = pageSeo.extend({
  template: z.literal("contact"),
  eyebrow: z.string().min(1).optional(),
  email: z.email().optional(),
  status: z.string().min(1).optional(),
  submitLabel: z.string().min(1).optional(),
  successTitle: z.string().min(1).optional(),
  successBody: z.string().min(1).optional(),
  draft: draftField,
});
