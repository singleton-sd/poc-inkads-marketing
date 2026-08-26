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
   changes — both need a human look)
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

## Verification

After merging the deployment PR, changing the Pages source, and creating the
DNS record:

```sh
dig +short inkads.poc.singletonsd.com CNAME
curl --fail --head https://inkads.poc.singletonsd.com
```

Expected DNS response: `singleton-sd.github.io.`. The HTTPS response should be
successful and use a certificate valid for `inkads.poc.singletonsd.com`.

If deployment must be rolled back, revert the responsible commit on `main`.
The resulting Pages workflow republishes the previous static build.
