# Editorial workflow

InkAds content is stored as Markdown in Git. Fixed page copy lives in
`src/content/pages`, editor-created marketing pages live in
`src/content/marketing`, FAQ answers live in `src/content/faqs`, and future
legal pages live in `src/content/legal`. Astro validates these collections
during `pnpm build`, so a pull request containing invalid or incomplete
frontmatter will fail the build before it can be merged.

## Editing through Git

Editors with repository access can edit or add Markdown files in GitHub and
open a pull request. This workflow is available now and does not require the
CMS admin application.

Landing-page frontmatter requires:

- `title`
- `description`
- `headline`
- `summary`
- optional `eyebrow`, `note`, and `pilots` (used by pages such as Pricing)
- optional `draft` (defaults to `false`)

Marketing-page frontmatter (Decap **Marketing pages** collection or
`src/content/marketing/<slug>.md`) requires a `template` select plus shared SEO
fields. Zod validates a **discriminatedUnion** on `template`, so each layout only
requires its own fields:

| Template           | Layout shape                                                        | Distinct fields                                                                                                                       |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `prose` (default)  | PageHero → markdown → optional CtaBand                              | optional `ctaLabel` + `ctaHref` (paired), optional `closingTitle` (band title; falls back to `headline`)                              |
| `cta-heavy`        | PageHero with actions → markdown → CtaBand                          | `primaryCta`, optional `secondaryCta`, `ctaTitle`                                                                                     |
| `landing-band`     | PageHero → FeatureGrid columns → InverseSection statement → CtaBand | `columns`, `statement`, `ctaTitle`, `primaryCta`, `secondaryCta` (markdown optional / usually omitted)                                |
| `audience-landing` | split PageHero + media + CTA → benefits → process → CtaBand         | `ctaLabel`, `ctaHref`, `mediaLabel`, `benefitsEyebrow`, `benefits`, `processEyebrow`, `processHeadline`, `process`, `closingHeadline` |

Shared on every marketing page:

- `template`
- `title`, `description`, `headline`, `summary`
- optional `eyebrow`
- optional `draft` (defaults to `false`)

Layout fixtures for visual review live at `/layout-prose/`, `/layout-cta-heavy/`,
`/layout-landing-band/`, and `/layout-audience/` (`draft: false`, titles prefixed
with “Layout fixture:”).

The filename slug becomes the public URL (`partners.md` → `/partners/`). Slugs
must be lowercase kebab-case and cannot match fixed routes such as `about`,
`contact`, or `pricing`. New marketing URLs are not added to site navigation
automatically (see GitHub issue #67).

FAQ item frontmatter requires:

- `question`
- `answer`
- `order`
- optional `link` (`label` + `href` matched inside the answer)
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
page, marketing, FAQ, and legal fields enforced by the Astro schemas.

GitHub Pages can serve the static admin files, but it cannot execute the OAuth
callback or safely hold the OAuth client secret. CMS login therefore uses the
shared org service **cms-oauth-kit** at `https://auth.singletonsd.com`
(`singleton-sd/cms-oauth-kit`). `public/admin/config.yml` sets
`base_url: https://auth.singletonsd.com` and `auth_endpoint: auth`. This
repository stays fully static and does not host Azure Functions.

Open `/admin` on `https://inkads.poc.singletonsd.com` or `localhost:4321`.
GitHub Pages / preview hosts that are not under `*.singletonsd.com` or
`*.patoperpetua.com` will not complete the popup handshake. Do not implement a
local OAuth proxy in this repository.

Editors need **write** access to this repository so that the GitHub OAuth grant
covers Decap's required `repo` scope. Do not commit OAuth client secrets or
access tokens to this repository.

The public landing page is generated entirely by Astro at build time. It does
not load Decap, call the OAuth service, or depend on `/admin/` being available.
