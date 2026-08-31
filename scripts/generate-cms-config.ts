import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CmsField } from "../src/content/schemas/cms.ts";
import { pageCmsEntries } from "../src/content/schemas/cms-registry.ts";
import { marketingCmsFields } from "../src/content/schemas/marketing.cms.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const outPath = path.join(rootDir, "public/admin/config.yml");

function yamlQuote(value: string): string {
  if (/[:#\n]|^[\s-]/.test(value) || value.includes("'")) {
    return JSON.stringify(value);
  }
  return value;
}

function serializeField(field: CmsField, indent = 10): string {
  const pad = " ".repeat(indent);
  const lines = [
    `${pad}- label: ${yamlQuote(field.label)}`,
    `${pad}  name: ${field.name}`,
    `${pad}  widget: ${field.widget}`,
  ];

  if (field.required === false) {
    lines.push(`${pad}  required: false`);
  }
  if (field.hint) {
    lines.push(`${pad}  hint: ${yamlQuote(field.hint)}`);
  }
  if (field.default !== undefined) {
    const defaultValue =
      typeof field.default === "string"
        ? yamlQuote(field.default)
        : String(field.default);
    lines.push(`${pad}  default: ${defaultValue}`);
  }
  if (field.value_type) {
    lines.push(`${pad}  value_type: ${field.value_type}`);
  }
  if (field.min !== undefined) {
    lines.push(`${pad}  min: ${field.min}`);
  }
  if (field.options) {
    lines.push(
      `${pad}  options: [${field.options.map((o) => yamlQuote(o)).join(", ")}]`,
    );
  }
  if (field.fields) {
    lines.push(`${pad}  fields:`);
    for (const child of field.fields) {
      lines.push(serializeInlineField(child, indent + 4));
    }
  }

  return lines.join("\n");
}

function serializeInlineField(field: CmsField, indent: number): string {
  const pad = " ".repeat(indent);
  const attrs = [
    `label: ${yamlQuote(field.label)}`,
    `name: ${field.name}`,
    `widget: ${field.widget}`,
  ];
  if (field.required === false) {
    attrs.push("required: false");
  }
  if (field.default !== undefined) {
    attrs.push(
      `default: ${typeof field.default === "string" ? yamlQuote(field.default) : field.default}`,
    );
  }
  if (field.options) {
    attrs.push(
      `options: [${field.options.map((o) => yamlQuote(o)).join(", ")}]`,
    );
  }
  return `${pad}- { ${attrs.join(", ")} }`;
}

function serializeFolderFields(fields: CmsField[]): string {
  return fields.map((field) => serializeField(field, 6)).join("\n");
}

function serializePageFiles(): string {
  const lines = pageCmsEntries.map((entry) => {
    const fieldBlock = entry.fields
      .map((field) => serializeField(field))
      .join("\n");
    return [
      "      - label: " + yamlQuote(entry.label),
      `        file: ${entry.file}`,
      `        name: ${entry.name}`,
      "        fields:",
      fieldBlock,
      "          - label: Body",
      "            name: body",
      "            widget: markdown",
    ].join("\n");
  });

  return lines.join("\n");
}

const config = `backend:
  name: github
  repo: singleton-sd/poc-inkads-marketing
  branch: main
  # Shared Decap OAuth proxy (cms-oauth-kit, https://auth.singletonsd.com)
  base_url: https://auth.singletonsd.com
  auth_endpoint: auth

publish_mode: editorial_workflow

site_url: https://inkads.poc.singletonsd.com
display_url: https://inkads.poc.singletonsd.com

media_folder: public/uploads
public_folder: /uploads

collections:
  - name: pages
    label: Pages
    files:
${serializePageFiles()}

  - name: marketing
    label: Marketing pages
    label_singular: Marketing page
    folder: src/content/marketing
    create: true
    delete: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
${serializeFolderFields(marketingCmsFields)}
      - label: Body
        name: body
        widget: markdown

  - name: faqs
    label: FAQ items
    label_singular: FAQ item
    folder: src/content/faqs
    create: true
    delete: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - label: Question
        name: question
        widget: string
      - label: Answer
        name: answer
        widget: text
      - label: Order
        name: order
        widget: number
        value_type: int
        min: 0
      - label: Inline link
        name: link
        widget: object
        required: false
        hint: Optional label matched inside the answer (for example Pricing).
        fields:
          - label: Label
            name: label
            widget: string
          - label: URL
            name: href
            widget: string
      - label: Draft
        name: draft
        widget: boolean
        default: false

  - name: legal
    label: Legal pages
    label_singular: Legal page
    folder: src/content/legal
    create: true
    delete: false
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - label: Title
        name: title
        widget: string
      - label: Description
        name: description
        widget: text
      - label: Effective date
        name: effectiveDate
        widget: datetime
        time_format: false
      - label: Draft
        name: draft
        widget: boolean
        default: true
      - label: Body
        name: body
        widget: markdown
`;

writeFileSync(outPath, config, "utf8");
console.log(`Generated ${outPath}`);
