import { draftCmsField, seoCmsFields, templateField } from "./cms.ts";

export const faqPageCms = {
  file: "src/content/pages/faq.md",
  label: "FAQ",
  name: "faq",
  fields: [
    templateField("faq"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    {
      label: "CTA title",
      name: "ctaTitle",
      widget: "string",
      required: false,
    },
    { label: "CTA label", name: "ctaLabel", widget: "string", required: false },
    { label: "CTA URL", name: "ctaHref", widget: "string", required: false },
    draftCmsField,
  ],
};
