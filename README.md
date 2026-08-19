# InkAds marketing

Public marketing site for the InkAds low-power e-paper advertising network.

Production: <https://inkads.poc.singletonsd.com>

## Local development

Requirements: Node.js 22.12 or newer and pnpm 11.

```sh
pnpm install
pnpm dev
```

Run the full local quality gate with:

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
- GitHub Issues for engineering delivery
- GitHub Pages at `inkads.poc.singletonsd.com`

The shared `@singleton-sd/tokens` package is currently hosted in a private
registry. This public repository therefore keeps its small semantic token
layer in source so installs, forks, and CI require no registry credential.

Marketing strategy, private commercial planning, customer information, and
pricing do not belong in this public repository.
