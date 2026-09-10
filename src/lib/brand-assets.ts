/**
 * Live InkAds brand marks from poc-inkads-assets (pinned jsDelivr CDN).
 * Bump the commit when assets main updates icons you want on the site.
 */
export const INKADS_ASSETS_COMMIT = "040d0a0d8e34653b780c0e807867c34c77b07e29";

const CDN_SVG_BASE = `https://cdn.jsdelivr.net/gh/singleton-sd/poc-inkads-assets@${INKADS_ASSETS_COMMIT}/svg`;

export type BrandIconVariant = "dark" | "light" | "mono" | "favicon";

/** Absolute CDN URL for an icon SVG (served live — not copied into this repo). */
export function brandIconUrl(variant: BrandIconVariant = "dark"): string {
  return `${CDN_SVG_BASE}/icon/icon-${variant}.svg`;
}

/** Absolute CDN URL for a horizontal lockup SVG (design doc 3b). */
export function brandLockupHorizontalUrl(
  variant: "dark" | "light" | "mono" = "dark",
): string {
  return `${CDN_SVG_BASE}/lockup-horizontal/lockup-horizontal-${variant}.svg`;
}
