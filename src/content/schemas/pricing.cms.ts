import { approvedInternalRoutes } from "../../lib/approved-internal-routes.ts";
import { draftCmsField, seoCmsFields, templateField } from "./cms.ts";

export const pricingPageCms = {
  file: "src/content/pages/pricing.md",
  label: "Pricing",
  name: "pricing",
  fields: [
    templateField("pricing"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    { label: "Note", name: "note", widget: "text", required: false },
    {
      label: "Pilots",
      name: "pilots",
      widget: "list",
      required: false,
      fields: [
        { label: "Eyebrow", name: "eyebrow", widget: "string" },
        { label: "Title", name: "title", widget: "string" },
        { label: "Description", name: "description", widget: "text" },
        { label: "CTA label", name: "ctaLabel", widget: "string" },
        {
          label: "Href",
          name: "href",
          widget: "select",
          options: approvedInternalRoutes,
        },
        {
          label: "Accent",
          name: "accent",
          widget: "select",
          options: ["brand", "audience"],
          default: "brand",
        },
      ],
    },
    draftCmsField,
  ],
};
