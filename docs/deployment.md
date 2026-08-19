# GitHub Pages deployment

The production site is built from `main` by `.github/workflows/pages.yml` and
published from the root of the `gh-pages` branch to:

<https://inkads.poc.singletonsd.com>

In-repository pull requests run the complete build gate and publish beneath
`https://inkads.poc.singletonsd.com/pr-preview/pr-<number>/`. The preview
workflow adds a managed **Preview** section to the PR body, updates the same
path when commits are pushed, and removes the preview and body section when the
PR closes. Pull requests from forks are not given write access to publish.

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
