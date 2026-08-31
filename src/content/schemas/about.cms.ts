import {
  ctaLinkCmsFields,
  draftCmsField,
  seoCmsFields,
  templateField,
} from "./cms.ts";

export const aboutPageCms = {
  file: "src/content/pages/about.md",
  label: "About",
  name: "about",
  fields: [
    templateField("about"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    {
      label: "Columns",
      name: "columns",
      widget: "list",
      fields: [
        { label: "Title", name: "title", widget: "string" },
        { label: "Body", name: "body", widget: "text" },
      ],
    },
    { label: "Parent brand copy", name: "parentBrand", widget: "text" },
    { label: "CTA title", name: "ctaTitle", widget: "string" },
    {
      label: "Primary CTA",
      name: "primaryCta",
      widget: "object",
      fields: ctaLinkCmsFields,
    },
    {
      label: "Secondary CTA",
      name: "secondaryCta",
      widget: "object",
      fields: ctaLinkCmsFields,
    },
    draftCmsField,
  ],
};
