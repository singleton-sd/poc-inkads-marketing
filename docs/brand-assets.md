# Brand assets

InkAds product marks are owned by
[`poc-inkads-assets`](https://github.com/singleton-sd/poc-inkads-assets).

## How this site consumes them

1. Pin a commit SHA in `scripts/sync-brand-assets.mjs` (`INKADS_ASSETS_COMMIT`).
2. `pnpm brand:sync` downloads the icon SVGs from jsDelivr into `public/brand/`.
3. `pnpm build` / `pnpm verify` run the sync before Astro so Pages and tests
   see local files (no runtime CDN dependency).

`BrandLockup` still references `${base}brand/icon-*.svg` — only the source of
those files changed.

Favicons and `og-image.png` stay marketing-owned (site chrome / social card),
not the assets `png/web/` bundle.

## Bump the pin

When assets `main` updates icons you want:

1. Note the new SHA from the assets repo.
2. Update `INKADS_ASSETS_COMMIT` and the table in the assets README.
3. Run `pnpm brand:sync` and commit the refreshed `public/brand/*.svg` if your
   workflow commits them, or rely on CI sync-only.

Horizontal lockups (design doc **3b**) remain available on the CDN; this site
builds the wordmark in CSS beside the icon (same visual system).
