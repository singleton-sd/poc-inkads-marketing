import {
  draftCmsField,
  placeCardCmsFields,
  seoCmsFields,
  templateField,
} from "./cms.ts";

export const placesPageCms = {
  file: "src/content/pages/places.md",
  label: "Places",
  name: "places",
  fields: [
    templateField("places"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    {
      label: "Places",
      name: "places",
      widget: "list",
      fields: placeCardCmsFields,
    },
    {
      label: "Constraint",
      name: "constraint",
      widget: "object",
      fields: [
        { label: "Eyebrow", name: "eyebrow", widget: "string" },
        { label: "Headline", name: "headline", widget: "string" },
        { label: "Body", name: "body", widget: "text" },
        { label: "Media label", name: "mediaLabel", widget: "string" },
      ],
    },
    {
      label: "CTA",
      name: "cta",
      widget: "object",
      fields: [
        { label: "Title", name: "title", widget: "string" },
        { label: "Label", name: "label", widget: "string" },
      ],
    },
    draftCmsField,
  ],
};
