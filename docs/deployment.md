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
   every built HTML route, compares each route to production
   (`https://inkads.poc.singletonsd.com`), and uploads:
   - `base/` — production (pre-PR), when the route already exists
   - `pr/` — this branch (post-PR)
   - `diff/` — red pixel diffs when both sides exist and differ
   - `index.html` — side-by-side review page
4. Removes the preview deploy and hides the sticky comment when the PR closes

Pull requests from forks are not given write access to publish.

To review a PR visually before merge:

1. Open the sticky **Preview** comment (or the Preview section at the top of the
   PR body) for the live site
2. In the **Deploy pull request preview** workflow run, download
   `visual-pr-<number>` and open `index.html` for before/after/diff

Production and preview workflows serialize writes to `gh-pages`. Production
deployment cleans stale production files while preserving the `pr-preview`
directory; each preview deployment changes only its own numbered directory.

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
