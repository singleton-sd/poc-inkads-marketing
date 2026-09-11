# InkAds marketing

Public marketing site for the InkAds low-power e-paper advertising network.

Production: <https://inkads.poc.singletonsd.com>

## Local development

Requirements: Node.js 22.12 or newer and pnpm 11.

```sh
pnpm install
pnpm dev
```

Brand marks load live from
[`poc-inkads-assets`](https://github.com/singleton-sd/poc-inkads-assets) Pages
CDN (`https://assets.inkads.poc.singletonsd.com`) — see
[`docs/brand-assets.md`](docs/brand-assets.md) and `src/lib/brand-assets.ts`.

Run the full local quality gate with:

```sh
pnpm verify
```

Or step-by-step:

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

## Architecture

- Astro static-site generation
- strict TypeScript
- Tailwind CSS with an InkAds semantic token layer
- Markdown content collections under `src/content/pages`
- PostKit email template sources under `content/email-templates/`
- Email template admin at `/admin/emails` (sibling to Decap `/admin`)
- GitHub Issues for engineering delivery
- GitHub Pages at `inkads.poc.singletonsd.com`

Deployment and Route 53 setup are documented in
[`docs/deployment.md`](docs/deployment.md).
Git-backed content schemas, the static Decap admin, email-template layout, and
OAuth requirements are documented in [`docs/editorial.md`](docs/editorial.md).

The shared `@singleton-sd/tokens` package is currently hosted in a private
registry. This public repository therefore keeps its small semantic token
layer in source so installs, forks, and CI require no registry credential.

Marketing strategy, private commercial planning, customer information, and
pricing do not belong in this public repository.
