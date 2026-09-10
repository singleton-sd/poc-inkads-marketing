# Brand assets

InkAds product marks are owned by
[`poc-inkads-assets`](https://github.com/singleton-sd/poc-inkads-assets) and
loaded **live** from a pinned jsDelivr CDN URL (not copied into this repo).

## How this site consumes them

1. Pin a commit SHA in `src/lib/brand-assets.ts` (`INKADS_ASSETS_COMMIT`).
2. `brandIconUrl()` / `brandLockupHorizontalUrl()` build absolute CDN URLs.
3. `BrandLockup` and JSON-LD `Organization.logo` use those URLs at runtime.

Favicons and `og-image.png` stay marketing-owned under `public/` (site chrome /
social card). They are not the assets `png/web/` bundle.

## Bump the pin

When assets `main` updates icons you want on the live site:

1. Note the new SHA from the assets repo.
2. Update `INKADS_ASSETS_COMMIT` (and the table in the assets README).
3. Redeploy marketing so HTML picks up the new URLs.

## CDN shape

```text
https://cdn.jsdelivr.net/gh/singleton-sd/poc-inkads-assets@<sha>/svg/icon/icon-dark.svg
```

See the [assets README](https://github.com/singleton-sd/poc-inkads-assets#consume-via-cdn-supported-now)
for the full catalog (icons, lockups, wordmarks).
