import { z } from "astro/zod";

import {
  DEFAULT_QR_REDIRECT_TARGET,
  isSafeQrRedirectTarget,
} from "../../lib/qr-redirect.ts";

export const redirectEntrySchema = z.object({
  target: z
    .string()
    .trim()
    .min(1)
    .refine(isSafeQrRedirectTarget, {
      message: `Must be a root-relative allowlisted path only (no external hosts). Default: ${DEFAULT_QR_REDIRECT_TARGET}`,
    }),
});
