/** Blob SHAs for the three Git-backed template source files. */
export interface TemplateBlobShas {
  template: string;
  metadata: string;
  preview: string;
}

export const STALE_TEMPLATE_MESSAGE =
  "Template changed on main since you loaded it. Reload and try again.";

/** Reject saves when any loaded blob SHA no longer matches main. */
export function assertTemplateRevisionFresh(
  expected: TemplateBlobShas,
  current: TemplateBlobShas,
): void {
  if (
    expected.template !== current.template ||
    expected.metadata !== current.metadata ||
    expected.preview !== current.preview
  ) {
    throw new Error(STALE_TEMPLATE_MESSAGE);
  }
}
