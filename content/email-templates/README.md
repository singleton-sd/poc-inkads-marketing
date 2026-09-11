# Email templates (PostKit)

Git-backed EmailBuilder sources for tenant `inkads`. Each subdirectory is one
template key and must contain:

- `template.json` — EmailBuilder.js document
- `metadata.json` — key, name, subject, variables, schemaVersion
- `preview.json` — sample values for in-editor preview

These files are **not** an Astro content collection and are **not** edited
through Decap. Publish is handled by CI (`post-kit-publish`) after merge; see
[`docs/editorial.md`](../../docs/editorial.md).

Do not put API keys or other secrets in this tree.
