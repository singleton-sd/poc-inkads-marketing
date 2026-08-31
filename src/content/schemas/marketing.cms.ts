import { approvedInternalRoutes } from "../../lib/approved-internal-routes.ts";
import type { CmsField } from "./cms.ts";
import { draftCmsField, seoCmsFields } from "./cms.ts";

export const marketingCmsFields: CmsField[] = [
  ...seoCmsFields,
  {
    label: "Eyebrow",
    name: "eyebrow",
    widget: "string",
    required: false,
    hint: "Short label above the headline in the hero.",
  },
  {
    label: "CTA label",
    name: "ctaLabel",
    widget: "string",
    required: false,
  },
  {
    label: "CTA URL",
    name: "ctaHref",
    widget: "select",
    options: approvedInternalRoutes,
    required: false,
  },
  draftCmsField,
];
