import {
  draftCmsField,
  featureItemCmsFields,
  seoCmsFields,
  templateField,
} from "./cms.ts";

export const advertisersPageCms = {
  file: "src/content/pages/advertisers.md",
  label: "Advertisers",
  name: "advertisers",
  fields: [
    templateField("advertisers"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    { label: "CTA label", name: "ctaLabel", widget: "string", required: false },
    {
      label: "Media placeholder label",
      name: "mediaLabel",
      widget: "string",
      required: false,
    },
    {
      label: "Benefits eyebrow",
      name: "benefitsEyebrow",
      widget: "string",
      required: false,
    },
    {
      label: "Benefits",
      name: "benefits",
      widget: "list",
      required: false,
      fields: featureItemCmsFields,
    },
    {
      label: "Designing eyebrow",
      name: "designingEyebrow",
      widget: "string",
      required: false,
    },
    {
      label: "Designing headline",
      name: "designingHeadline",
      widget: "string",
    },
    { label: "Designing body", name: "designingBody", widget: "text" },
    { label: "Closing headline", name: "closingHeadline", widget: "string" },
    draftCmsField,
  ],
};
