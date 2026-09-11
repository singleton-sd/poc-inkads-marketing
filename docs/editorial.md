# Editorial workflow

InkAds content is stored as Markdown in Git. Fixed page copy lives in
`src/content/pages`, editor-created marketing pages live in
`src/content/marketing`, FAQ answers live in `src/content/faqs`, and future
legal pages live in `src/content/legal`. Astro validates these collections
during `pnpm build`, so a pull request containing invalid or incomplete
frontmatter will fail the build before it can be merged.

Transactional and marketing **email** sources live separately under
`content/email-templates/` (PostKit). They are not Astro collections and are
not Decap widgets — see [Email templates (PostKit)](#email-templates-postkit)
below.

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
- optional `navLabel`, `showInHeader`, `showInFooter` (navigation opt-in;
  defaults hidden — see below)
- optional `draft` (defaults to `false`)

### Marketing pages in site navigation

Published marketing pages stay **out of** the header and footer until you opt
in. Set:

| Field          | Effect                                                                |
| -------------- | --------------------------------------------------------------------- |
| `showInHeader` | When `true`, appends the page to the primary header nav at build time |
| `showInFooter` | When `true`, appends the page to the footer **Company** column        |
| `navLabel`     | Link text used in nav (required when either show flag is `true`)      |

Hardcoded core links (How it works, Venues, About, FAQ, etc.) are never
replaced — CMS entries are additive only. Draft pages are excluded from nav and
from the public site.

Published marketing slugs are also added to the CTA allowlist
(`approvedInternalRoutes`) at build time, so peer marketing pages can be linked
from CTAs even when they remain hidden from navigation. Decap CTA URL fields are
free-text root-relative paths (not a static select list) so newly published
marketing routes are usable without regenerating `public/admin/config.yml`; the
Astro schemas still reject paths outside the allowlist at build.

Layout fixtures for visual review live at `/layout-prose/`, `/layout-cta-heavy/`,
`/layout-landing-band/`, and `/layout-audience/` (`draft: false`, titles prefixed
with “Layout fixture:”). Fixtures stay out of nav by default.

The filename slug becomes the public URL (`partners.md` → `/partners/`). Slugs
must be lowercase kebab-case and cannot match fixed routes such as `about`,
`contact`, or `pricing`.

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

## Email templates (PostKit)

Git is the source of truth for PostKit email template sources. Layout:

```text
content/email-templates/<key>/
  template.json   # EmailBuilder.js document
  metadata.json   # key, name, subject, variables, schemaVersion
  preview.json    # synthetic sample values for in-editor preview
```

Seeded keys today:

| Key                          | Purpose                                                |
| ---------------------------- | ------------------------------------------------------ |
| `demo.welcome`               | Compile-clean fixture for publish CI                   |
| `marketing.waitlist-confirm` | Waitlist confirmation (used when a waitlist BFF ships) |

**Not a Decap collection.** Do not model EmailBuilder JSON as widgets in
`public/admin/config.yml`. An authenticated email admin UI (sibling to
`/admin`, e.g. `/admin/emails`) will embed `@singleton-sd/post-kit-editor` and
save via Git commit/PR — tracked under epic
[#104](https://github.com/singleton-sd/poc-inkads-marketing/issues/104).

After [#100](https://github.com/singleton-sd/poc-inkads-marketing/issues/100)
lands, consumer CI will run `post-kit-publish` to Azure Blob for tenant
`inkads` (see PostKit
[`docs/examples/publish-email-templates.yml`](https://github.com/singleton-sd/post-kit/blob/main/docs/examples/publish-email-templates.yml)
and [`docs/guides/template-publishing.md`](https://github.com/singleton-sd/post-kit/blob/main/docs/guides/template-publishing.md)).
Until then, merged template sources stay in Git only. Authoring rules:
[`docs/guides/template-authoring.md`](https://github.com/singleton-sd/post-kit/blob/main/docs/guides/template-authoring.md).

Never commit PostKit API keys or other secrets under `content/email-templates/`.
The contact form continues to use browser `POST /contact` and does not require
these templates.

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
