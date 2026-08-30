import { z } from "astro/zod";

import { draftField, pageSeo } from "./shared";

export const supportPageSchema = pageSeo.extend({
  template: z.literal("support"),
  draft: draftField,
});
