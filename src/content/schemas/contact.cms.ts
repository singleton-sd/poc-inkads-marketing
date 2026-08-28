import { draftCmsField, seoCmsFields, templateField } from "./cms.ts";

export const contactPageCms = {
  file: "src/content/pages/contact.md",
  label: "Contact",
  name: "contact",
  fields: [
    templateField("contact"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    { label: "Email", name: "email", widget: "string", required: false },
    { label: "Status", name: "status", widget: "string", required: false },
    {
      label: "Submit label",
      name: "submitLabel",
      widget: "string",
      required: false,
    },
    {
      label: "Success title",
      name: "successTitle",
      widget: "string",
      required: false,
    },
    {
      label: "Success body",
      name: "successBody",
      widget: "text",
      required: false,
    },
    draftCmsField,
  ],
};
