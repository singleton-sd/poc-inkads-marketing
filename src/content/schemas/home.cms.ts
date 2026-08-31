import { draftCmsField, seoCmsFields, templateField } from "./cms.ts";

export const homePageCms = {
  file: "src/content/pages/home.md",
  label: "Home",
  name: "home",
  fields: [templateField("home"), ...seoCmsFields, draftCmsField],
};
