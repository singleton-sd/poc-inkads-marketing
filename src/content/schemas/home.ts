import { z } from "astro/zod";

import { draftField, pageSeo } from "./shared";

export const homePageSchema = pageSeo.extend({
  template: z.literal("home"),
  draft: draftField,
});
