import { draftCmsField, seoCmsFields, templateField } from "./cms.ts";

export const supportPageCms = {
  file: "src/content/pages/support.md",
  label: "Support",
  name: "support",
  fields: [templateField("support"), ...seoCmsFields, draftCmsField],
};
