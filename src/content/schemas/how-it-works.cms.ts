import {
  ctaLinkCmsFields,
  draftCmsField,
  featureItemCmsFields,
  seoCmsFields,
  templateField,
} from "./cms.ts";

export const howItWorksPageCms = {
  file: "src/content/pages/how-it-works.md",
  label: "How it works",
  name: "how-it-works",
  fields: [
    templateField("how-it-works"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string" },
    {
      label: "Steps",
      name: "steps",
      widget: "list",
      fields: [
        { label: "Number", name: "number", widget: "string" },
        { label: "Title", name: "title", widget: "string" },
        { label: "Description", name: "description", widget: "text" },
      ],
    },
    { label: "Features eyebrow", name: "featuresEyebrow", widget: "string" },
    { label: "Features headline", name: "featuresHeadline", widget: "string" },
    {
      label: "Features",
      name: "features",
      widget: "list",
      fields: featureItemCmsFields,
    },
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
