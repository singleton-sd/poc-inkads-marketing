# Email templates (PostKit)

Git-backed EmailBuilder sources for tenant `inkads`. Each subdirectory is one
template key and must contain:

- `template.json` — EmailBuilder.js document
- `metadata.json` — key, name, subject, variables, schemaVersion
- `preview.json` — sample values for in-editor preview

These files are **not** an Astro content collection and are **not** edited
through Decap. An in-browser editor is deferred until PostKit ships
`EmailTemplateAdmin` (then marketing #101). Publishing with CI
(`post-kit-publish`) is planned in
[#100](https://github.com/singleton-sd/poc-inkads-marketing/issues/100) and is
not enabled yet; see [`docs/editorial.md`](../../docs/editorial.md).

Do not put API keys or other secrets in this tree.
