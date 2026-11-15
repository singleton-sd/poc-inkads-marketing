# GitHub Pages deployment

The production site is built from `main` by `.github/workflows/pages.yml` and
published from the root of the `gh-pages` branch to:

<https://inkads.poc.singletonsd.com>

In-repository pull requests run the complete build gate and publish beneath
`https://inkads.poc.singletonsd.com/pr-preview/pr-<number>/`. The preview
workflow:

1. Posts a **sticky PR comment** with the live preview link (survives body edits)
2. Puts a managed **Preview** section at the **top** of the PR body (see
   `.github/pull_request_template.md` for the starting placeholder)
3. Captures Playwright full-page screenshots (desktop 1440 + mobile 390) for
   every built HTML route, compares each route to a **build of the PR base
   SHA** (same `/` Astro base as the PR visual build — not live production),
   and hosts a report at `…/pr-<number>/visual/` (`base/` · `pr/` · `diff/` ·
   `index.html`)
4. Runs a required **`visual-review`** status check that **fails** when any
   route is `changed` or `new` vs that base build. That is a review gate (not a
   broken Playwright install). New routes still capture the baseline `404` page
   as “before” and write a pixel `diff/` so reviewers can compare.
5. Removes the preview deploy and hides the sticky comment when the PR closes

Pull requests from forks are not given write access to publish.

## Visual review and accept

Baseline is the PR’s base branch tip (usually `main`), built in CI. Live
production is not used — it can lag when Pages deploys fail.

1. Open the sticky **Preview** comment → **Open visual report**
2. If **`visual-review`** is red, review base / PR / diff (new pages or pixel
   changes — both need a human look). Unchanged routes are collapsed by default;
   use **Expand all** or open only the routes listed in the sticky comment.
3. When the changes are intentional, add the **`visual-accepted`** label
4. A thin workflow run clears **`visual-review`** automatically (no rebuild)
5. Merge when `visual-review` is green

Removing **`visual-accepted`** re-runs the gate against the last capture and fails
again if diffs remain.

CI-only PRs with no page changes should pass `visual-review` with zero diffs.

### Required status check

Under the **Main** ruleset, require the status check named **`visual-review`**
(job name from `.github/workflows/preview.yml`). After renaming from `visual`,
update the ruleset to the new name. `preview` still deploys even when
`visual-review` fails so the report URL stays available.

## Preview concurrency

Preview runs use a **per-PR** concurrency group (`preview-pr-<n>`) so updating
many open PRs at once does not cancel other queued previews. (A shared
`pages-publish` group drops previously pending runs when a newer one queues.)
Production still uses `pages-publish`. Preview deploy/remove steps retry once
on failure when parallel `gh-pages` writes race (composite actions cannot use
`wretry.action`).

## One-time GitHub Pages configuration

Configure the repository to deploy GitHub Pages from the `gh-pages` branch and
the repository root. Set the custom domain to `inkads.poc.singletonsd.com`.
The production build includes a matching `CNAME` file so branch deployments
retain the custom domain.

Under **Settings > Actions > General > Workflow permissions**, select **Read
and write permissions**. The workflows also declare their narrower permissions
explicitly.

GitHub provisions the TLS certificate after DNS resolves. Enable **Enforce
HTTPS** only after the certificate is available.

## AWS Route 53 record

In the public `poc.singletonsd.com` hosted zone, create this record:

| Name                         | Type    | Value                    | TTL   |
| ---------------------------- | ------- | ------------------------ | ----- |
| `inkads.poc.singletonsd.com` | `CNAME` | `singleton-sd.github.io` | `300` |

Do not point the subdomain at the apex domain and do not create an alias to a
private distribution. The record contains no secret.

## Contact and waitlist forms (lead-intake)

The static site posts JSON from the browser to the shared job-kit public
function:

`POST https://api.singletonsd.com/v1/leads`

Body is `application/json` and must stay under 16 KB. The gateway owns CORS.
InkAds is allowlisted only as origin **`https://inkads.poc.singletonsd.com`**,
and `sourceSite` in the payload must match that origin. There is no server
code in this repository for lead intake.

Cloudflare Turnstile is rendered on each form. Bake the **public** site key at
build time with Actions variable `PUBLIC_TURNSTILE_SITE_KEY` (see
`.env.example`). The production Pages workflow fails the build if that
variable is empty. Never commit the Turnstile secret; job-kit verifies tokens.

The API currently returns `404 function_disabled` until operators enable
lead-intake. The forms treat that as temporarily unavailable.

### Hosting (production origin)

| Check                                                  | Value                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Custom domain                                          | `inkads.poc.singletonsd.com` (`public/CNAME`, Astro `site`) |
| DNS                                                    | Route 53 CNAME → `singleton-sd.github.io`                   |
| Host                                                   | GitHub Pages (`gh-pages` branch, repository root)           |
| `https://singleton-sd.github.io/poc-inkads-marketing/` | 301 to the custom domain                                    |

That hostname matches the job-kit / gateway allowlist. Do not serve production
from another origin without updating the allowlist. PR previews stay on the
same host under `/pr-preview/pr-<n>/`, so `Origin` remains
`https://inkads.poc.singletonsd.com`.

### Required GitHub Actions variables

| Variable                    | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key baked into static JS |

Email-template publish still uses Azure OIDC (`AZURE_CLIENT_ID`,
`AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) as documented below. The marketing
site build no longer reads PostKit App Configuration.

### Email template publish (Blob)

`.github/workflows/publish-email-templates.yml` compiles
`content/email-templates/` on PRs and, on `main` (or `workflow_dispatch`),
runs `post-kit-publish` over OIDC into Azure Blob:

```text
tenants/inkads/{environment}/templates/{key}/template.html
tenants/inkads/{environment}/templates/{key}/metadata.json
tenants/inkads/{environment}/templates/{key}/manifest.json
```

| Setting         | Default                                    | Override variable                    |
| --------------- | ------------------------------------------ | ------------------------------------ |
| Tenant          | `inkads`                                   | (fixed)                              |
| Environment     | `production` on `main`; else `development` | `workflow_dispatch` input            |
| Storage account | `ssdpostkitstprodae`                       | `POSTKIT_TEMPLATE_STORAGE_ACCOUNT`   |
| Container       | `templates`                                | `POSTKIT_TEMPLATE_STORAGE_CONTAINER` |

Uses the same `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID`
OIDC variables for email-template publish. That identity also needs **Storage Blob Data
Contributor** (or narrower container scope) on the template storage account —
App Configuration Data Reader alone is not enough to publish. Never put
storage account keys, connection strings, or `POSTKIT_API_KEY` in GitHub
Secrets or this repository.

Local compile check (no Azure):

```sh
pnpm templates:compile
```

### Local Turnstile key

```sh
export PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
pnpm build
```

Submit stays disabled until Turnstile issues a token. Use a placeholder in
`.env.example`; never hardcode a production key.

### Deep-link query prefills

Marketing CTAs and QR codes may open `/contact?role=venue|advertiser|other`
(and optional safe `name` / `email`). See
[design-reference/contact.md](design-reference/contact.md#query-prefills-deep-links--qr).
**Never put secrets in URL query strings.**

## Verification

After merging the deployment PR, changing the Pages source, and creating the
DNS record:

```sh
dig +short inkads.poc.singletonsd.com CNAME
curl --fail --head https://inkads.poc.singletonsd.com
```

Expected DNS response: `singleton-sd.github.io.`. The HTTPS response should be
successful and use a certificate valid for `inkads.poc.singletonsd.com`.

## House-ad QR redirect

House-ad QR codes must encode the stable public URL (HTTPS only):

`https://inkads.poc.singletonsd.com/go`

GitHub Pages serves a static redirect page at `/go` (meta-refresh + JS). Editors
change the destination in `src/content/redirects/go.md` (or Decap **Redirects**)
without regenerating QR artwork. Targets must be root-relative allowlisted paths
only — no open redirects to arbitrary hosts. Default target:
`/contact?role=venue`.

If deployment must be rolled back, revert the responsible commit on `main`.
The resulting Pages workflow republishes the previous static build.
