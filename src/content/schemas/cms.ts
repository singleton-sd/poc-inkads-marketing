import { approvedInternalRoutes } from "../../lib/approved-internal-routes.ts";

export type CmsField = {
  label: string;
  name: string;
  widget: string;
  required?: boolean;
  hint?: string;
  default?: string | boolean | number;
  value_type?: string;
  min?: number;
  fields?: CmsField[];
  options?: string[];
};

export const seoCmsFields: CmsField[] = [
  {
    label: "Title",
    name: "title",
    widget: "string",
    hint: "Page title (browser tab / SEO).",
  },
  {
    label: "Description",
    name: "description",
    widget: "text",
    hint: "Short meta description for SEO.",
  },
  {
    label: "Headline",
    name: "headline",
    widget: "string",
  },
  {
    label: "Summary",
    name: "summary",
    widget: "text",
    hint: "Hero lead / supporting sentence.",
  },
];

export function templateField(template: string): CmsField {
  return {
    label: "Template",
    name: "template",
    widget: "hidden",
    default: template,
  };
}

export const draftCmsField: CmsField = {
  label: "Draft",
  name: "draft",
  widget: "boolean",
  required: false,
  default: false,
};

export const ctaLinkCmsFields: CmsField[] = [
  { label: "Label", name: "label", widget: "string" },
  {
    label: "URL",
    name: "href",
    widget: "select",
    options: approvedInternalRoutes,
  },
];

export const featureItemCmsFields: CmsField[] = [
  { label: "Title", name: "title", widget: "string" },
  { label: "Description", name: "description", widget: "text" },
];

export const processStepCmsFields: CmsField[] = [
  { label: "Label", name: "label", widget: "string" },
  { label: "Detail", name: "detail", widget: "text" },
];

export const placeCardCmsFields: CmsField[] = [
  { label: "Index", name: "index", widget: "string" },
  { label: "Title", name: "title", widget: "string" },
  { label: "Description", name: "description", widget: "text" },
  { label: "Featured", name: "featured", widget: "boolean", required: false },
  { label: "Tag", name: "tag", widget: "string", required: false },
];

export type PageCmsEntry = {
  file: string;
  label: string;
  name: string;
  fields: CmsField[];
};
