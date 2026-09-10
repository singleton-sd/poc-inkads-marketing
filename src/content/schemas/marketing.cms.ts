import { approvedInternalRoutes } from "../../lib/approved-internal-routes.ts";
import type { CmsField } from "./cms.ts";
import {
  ctaLinkCmsFields,
  draftCmsField,
  featureItemCmsFields,
  processStepCmsFields,
  seoCmsFields,
} from "./cms.ts";

const marketingTemplates = [
  "prose",
  "cta-heavy",
  "landing-band",
  "audience-landing",
] as const;

const templateSelectField: CmsField = {
  label: "Template",
  name: "template",
  widget: "select",
  default: "prose",
  options: [...marketingTemplates],
  hint: "Chooses the page layout. Only fill fields for the selected template — the build validates the rest.",
};

const eyebrowField: CmsField = {
  label: "Eyebrow",
  name: "eyebrow",
  widget: "string",
  required: false,
  hint: "Short label above the headline in the hero.",
};

/** Prose layout — optional single closing CTA (label + href together). */
const proseFields: CmsField[] = [
  {
    label: "CTA label",
    name: "ctaLabel",
    widget: "string",
    required: false,
    hint: "prose / audience-landing: button label.",
  },
  {
    label: "CTA URL",
    name: "ctaHref",
    widget: "select",
    options: approvedInternalRoutes,
    required: false,
    hint: "prose / audience-landing: must pair with CTA label.",
  },
  {
    label: "Closing title",
    name: "closingTitle",
    widget: "string",
    required: false,
    hint: "prose: optional CtaBand title (defaults to headline).",
  },
];

/** CTA-heavy + landing-band shared closing CTA objects. */
const pairedCtaFields: CmsField[] = [
  {
    label: "CTA title",
    name: "ctaTitle",
    widget: "string",
    required: false,
    hint: "cta-heavy / landing-band: closing band title.",
  },
  {
    label: "Primary CTA",
    name: "primaryCta",
    widget: "object",
    required: false,
    hint: "cta-heavy / landing-band: required for those templates.",
    fields: ctaLinkCmsFields,
  },
  {
    label: "Secondary CTA",
    name: "secondaryCta",
    widget: "object",
    required: false,
    hint: "cta-heavy: optional. landing-band: required.",
    fields: ctaLinkCmsFields,
  },
];

/** Landing-band (About-shaped) structured sections. */
const landingBandFields: CmsField[] = [
  {
    label: "Columns",
    name: "columns",
    widget: "list",
    required: false,
    hint: "landing-band: feature columns under the hero.",
    fields: [
      { label: "Title", name: "title", widget: "string" },
      { label: "Body", name: "body", widget: "text" },
    ],
  },
  {
    label: "Statement",
    name: "statement",
    widget: "text",
    required: false,
    hint: "landing-band: centered inverse-section copy.",
  },
];

/** Audience-landing (Venues-lite) structured sections. */
const audienceLandingFields: CmsField[] = [
  {
    label: "Media placeholder label",
    name: "mediaLabel",
    widget: "string",
    required: false,
    hint: "audience-landing: split-hero media label.",
  },
  {
    label: "Benefits eyebrow",
    name: "benefitsEyebrow",
    widget: "string",
    required: false,
    hint: "audience-landing: inverse section eyebrow.",
  },
  {
    label: "Benefits",
    name: "benefits",
    widget: "list",
    required: false,
    hint: "audience-landing: benefit feature items.",
    fields: featureItemCmsFields,
  },
  {
    label: "Process eyebrow",
    name: "processEyebrow",
    widget: "string",
    required: false,
    hint: "audience-landing: process section eyebrow.",
  },
  {
    label: "Process headline",
    name: "processHeadline",
    widget: "string",
    required: false,
    hint: "audience-landing: process section title.",
  },
  {
    label: "Process steps",
    name: "process",
    widget: "list",
    required: false,
    hint: "audience-landing: process rows.",
    fields: processStepCmsFields,
  },
  {
    label: "Closing headline",
    name: "closingHeadline",
    widget: "string",
    required: false,
    hint: "audience-landing: CtaBand title.",
  },
];

const navFields: CmsField[] = [
  {
    label: "Nav label",
    name: "navLabel",
    widget: "string",
    required: false,
    hint: "Label in header/footer when navigation opt-in is enabled. Required if either show flag is on.",
  },
  {
    label: "Show in header",
    name: "showInHeader",
    widget: "boolean",
    required: false,
    default: false,
    hint: "When true, appends this page to the primary header nav at build time.",
  },
  {
    label: "Show in footer",
    name: "showInFooter",
    widget: "boolean",
    required: false,
    default: false,
    hint: "When true, appends this page to the footer Company column at build time.",
  },
];

export const marketingCmsFields: CmsField[] = [
  templateSelectField,
  ...seoCmsFields,
  eyebrowField,
  ...proseFields,
  ...pairedCtaFields,
  ...landingBandFields,
  ...audienceLandingFields,
  ...navFields,
  draftCmsField,
];
