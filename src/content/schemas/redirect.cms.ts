import type { PageCmsEntry } from "./cms.ts";
import { DEFAULT_QR_REDIRECT_TARGET } from "../../lib/qr-redirect.ts";

/** Decap file entry for the stable house-ad QR redirect at `/go`. */
export const goRedirectCms: PageCmsEntry = {
  file: "src/content/redirects/go.md",
  label: "QR redirect (/go)",
  name: "go",
  fields: [
    {
      label: "Target",
      name: "target",
      widget: "string",
      default: DEFAULT_QR_REDIRECT_TARGET,
      hint: "Root-relative allowlisted path only (e.g. /contact?role=venue). No http(s):// or // hosts. Validated at build.",
    },
  ],
};
