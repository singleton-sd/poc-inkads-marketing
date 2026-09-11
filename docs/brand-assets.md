# Brand assets

InkAds product marks are owned by
[`poc-inkads-assets`](https://github.com/singleton-sd/poc-inkads-assets) and
loaded **live** from the assets Pages CDN (not copied into this repo).

Base: https://assets.inkads.poc.singletonsd.com

## How this site consumes them

1. `INKADS_ASSETS_CDN` in `src/lib/brand-assets.ts` points at the Pages host.
2. `brandIconUrl()` / `brandLockupHorizontalUrl()` build absolute CDN URLs.
3. `BrandLockup` and JSON-LD `Organization.logo` use those URLs at runtime.

Favicons and `og-image.png` stay marketing-owned under `public/` (site chrome /
social card). They are not the assets favicon / OG bundle — switch those later
if desired (`/favicons/…`, `/og-image/…` on the same host).

## CDN shape

```text
https://assets.inkads.poc.singletonsd.com/svg/icon/icon-dark.svg
https://assets.inkads.poc.singletonsd.com/svg/lockup-horizontal/lockup-horizontal-dark.svg
```

See the [assets README](https://github.com/singleton-sd/poc-inkads-assets) and
[`docs/deployment.md`](https://github.com/singleton-sd/poc-inkads-assets/blob/main/docs/deployment.md)
for the full catalog.

## House-ad QR destination

Encode this marketing-site URL in house-ad QR art (not an assets CDN path):

`https://inkads.poc.singletonsd.com/go`

The destination behind `/go` is configured in the marketing repo
(`src/content/redirects/go.md`) so QR artwork stays stable when the landing
target changes. See marketing `docs/editorial.md` and `docs/deployment.md`.
