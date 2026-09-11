# Email templates (PostKit)

Git-backed EmailBuilder sources for tenant `inkads`. Each subdirectory is one
template key and must contain:

- `template.json` — EmailBuilder.js document
- `metadata.json` — key, name, subject, variables, schemaVersion
- `preview.json` — sample values for in-editor preview

These files are **not** an Astro content collection and are **not** edited
through Decap. An in-browser editor is deferred until PostKit ships
`EmailTemplateAdmin` (then marketing #101). Publishing with CI
(`post-kit-publish`) runs on merge to `main` via
`.github/workflows/publish-email-templates.yml`; see
[`docs/editorial.md`](../../docs/editorial.md) and
[`docs/deployment.md`](../../docs/deployment.md).

Local compile check: `pnpm templates:compile`.

Do not put API keys or other secrets in this tree.
