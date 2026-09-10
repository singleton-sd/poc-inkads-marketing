/**
 * Live InkAds brand marks from the assets Pages CDN.
 * @see https://assets.inkads.poc.singletonsd.com
 * @see https://github.com/singleton-sd/poc-inkads-assets
 */
export const INKADS_ASSETS_CDN = "https://assets.inkads.poc.singletonsd.com";

export type BrandIconVariant = "dark" | "light" | "mono" | "favicon";

/** Absolute CDN URL for an icon SVG (served live — not copied into this repo). */
export function brandIconUrl(variant: BrandIconVariant = "dark"): string {
  return `${INKADS_ASSETS_CDN}/svg/icon/icon-${variant}.svg`;
}

/** Absolute CDN URL for a horizontal lockup SVG (design doc 3b). */
export function brandLockupHorizontalUrl(
  variant: "dark" | "light" | "mono" = "dark",
): string {
  return `${INKADS_ASSETS_CDN}/svg/lockup-horizontal/lockup-horizontal-${variant}.svg`;
}
