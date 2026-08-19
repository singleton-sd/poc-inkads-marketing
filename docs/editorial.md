# Editorial workflow

InkAds content is stored as Markdown in Git. The landing-page source lives in
`src/content/pages`, and future legal pages live in `src/content/legal`. Astro
validates both collections during `pnpm build`, so a pull request containing
invalid or incomplete frontmatter will fail the build before it can be merged.

## Editing through Git

Editors with repository access can edit or add Markdown files in GitHub and
open a pull request. This workflow is available now and does not require the
CMS admin application.

Landing-page frontmatter requires:

- `title`
- `description`
- `headline`
- `summary`
- optional `draft` (defaults to `false`)

Legal-page frontmatter requires:

- `title`
- `description`
- `effectiveDate`
- optional `draft` (defaults to `true`)

Run the full quality gate before merging editorial changes:

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

## Decap admin and authentication boundary

The production build includes a static Decap application at `/admin/`. Its
configuration targets `singleton-sd/poc-inkads-marketing` and maps the same
landing and legal fields enforced by the Astro schemas.

**CMS login is intentionally unavailable** without an external OAuth
integration. GitHub Pages can serve the static admin files, but it cannot execute the OAuth callback
or safely hold the OAuth client secret.

The shared OAuth service is deployed as an Azure Function
(`ssd-pocpk-decap-oauth-dev-ae`, `poc-plattform-kit` infra). Its `base_url`
and `auth_endpoint` are already configured in `public/admin/config.yml`.
Editors need **write** access to this repository so that the GitHub OAuth grant
covers Decap's required `repo` scope. Do not commit OAuth client secrets or
access tokens to this repository.

The public landing page is generated entirely by Astro at build time. It does
not load Decap, call the OAuth service, or depend on `/admin/` being available.
