import { approvedInternalRoutes } from "../../lib/approved-internal-routes.ts";
import {
  draftCmsField,
  featureItemCmsFields,
  processStepCmsFields,
  seoCmsFields,
  templateField,
} from "./cms.ts";

export const venuesPageCms = {
  file: "src/content/pages/venues.md",
  label: "Venues",
  name: "venues",
  fields: [
    templateField("venues"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string" },
    { label: "CTA label", name: "ctaLabel", widget: "string" },
    {
      label: "CTA URL",
      name: "ctaHref",
      widget: "select",
      options: approvedInternalRoutes,
    },
    {
      label: "Media placeholder label",
      name: "mediaLabel",
      widget: "string",
    },
    { label: "Benefits eyebrow", name: "benefitsEyebrow", widget: "string" },
    {
      label: "Benefits",
      name: "benefits",
      widget: "list",
      fields: featureItemCmsFields,
    },
    { label: "Process eyebrow", name: "processEyebrow", widget: "string" },
    { label: "Process headline", name: "processHeadline", widget: "string" },
    {
      label: "Process steps",
      name: "process",
      widget: "list",
      fields: processStepCmsFields,
    },
    { label: "Closing headline", name: "closingHeadline", widget: "string" },
    draftCmsField,
  ],
};
