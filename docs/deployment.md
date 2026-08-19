# GitHub Pages deployment

The production site is published from `main` by
`.github/workflows/pages.yml` to:

<https://inkads.poc.singletonsd.com>

Pull requests run the complete build gate but do not deploy. Merges to `main`
build `dist`, upload the GitHub Pages artifact, and deploy it to the protected
`github-pages` environment.

## One-time GitHub Pages configuration

Configure the repository to use GitHub Actions as its Pages source and set the
custom domain to `inkads.poc.singletonsd.com`. GitHub Actions custom workflows
ignore `CNAME` files, so the Pages repository setting is authoritative.

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

After merging the deployment PR and creating the DNS record:

```sh
dig +short inkads.poc.singletonsd.com CNAME
curl --fail --head https://inkads.poc.singletonsd.com
```

Expected DNS response: `singleton-sd.github.io.`. The HTTPS response should be
successful and use a certificate valid for `inkads.poc.singletonsd.com`.

If deployment must be rolled back, revert the responsible commit on `main`.
The resulting Pages workflow republishes the previous static build.
