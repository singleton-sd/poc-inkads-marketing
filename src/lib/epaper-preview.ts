import {
  clampFraming,
  coverWindowSize,
  defaultFraming,
  defineDisplayProfile,
  framingPanRoom,
  fromRgbaImageData,
  nextSourceRotation,
  normaliseToProfile,
  packMonoBitmap,
  renderMono,
  rotatedImageSize,
  sourceRectFromFraming,
  toPreviewImage,
  waveshare75BwProfile,
  type FramingPanRoom,
  type FramingState,
  type ImageSize,
  type MonoRenderMode,
  type SourceRotation,
} from "@singleton-sd/inkads-epaper-renderer";

export type { FramingPanRoom, FramingState, ImageSize, SourceRotation };
export {
  clampFraming,
  coverWindowSize,
  defaultFraming,
  framingPanRoom,
  nextSourceRotation,
  rotatedImageSize,
  sourceRectFromFraming,
};

export type FramingProfileSize = Pick<
  typeof waveshare75BwProfile,
  "width" | "height"
>;

export type PanDirection = "n" | "s" | "e" | "w";

export type PanFramingOptions = {
  /** Fraction of the current window to shift (default 0.25). */
  readonly step?: number;
};

/**
 * Shift framing so the artwork moves in the named direction on screen
 * (arrow / drag semantics), not so the crop window crawls that way.
 */
export function panFraming(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
  direction: PanDirection,
  options: PanFramingOptions = {},
): FramingState {
  const step = options.step ?? 0.25;
  const base = clampFraming(image, framing, profile);
  const rect = sourceRectFromFraming(image, base, profile);
  // Positive screen move (image east/south) decreases the window centre.
  const dx =
    direction === "e"
      ? -rect.width * step
      : direction === "w"
        ? rect.width * step
        : 0;
  const dy =
    direction === "s"
      ? -rect.height * step
      : direction === "n"
        ? rect.height * step
        : 0;
  return nudgeFraming(image, base, profile, dx, dy);
}

/**
 * Apply a source-pixel centre delta (after clamp). Positive dx moves the
 * crop window east (artwork appears to slide west).
 */
export function nudgeFraming(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
  deltaCenterX: number,
  deltaCenterY: number,
): FramingState {
  const base = clampFraming(image, framing, profile);
  return clampFraming(
    image,
    {
      ...base,
      centerX: base.centerX + deltaCenterX,
      centerY: base.centerY + deltaCenterY,
    },
    profile,
  );
}

/**
 * Map a screen-pixel drag (image follows the pointer) into a framing nudge.
 * `displayWidth` / `displayHeight` are the on-screen preview box size.
 */
export function framingNudgeFromPointerDrag(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
  clientDx: number,
  clientDy: number,
  displayWidth: number,
  displayHeight: number,
): FramingState {
  const base = clampFraming(image, framing, profile);
  const rect = sourceRectFromFraming(image, base, profile);
  if (displayWidth <= 0 || displayHeight <= 0) return base;
  // Image follows the pointer: drag right → artwork moves right → centre −X.
  const deltaCenterX = -(clientDx / displayWidth) * rect.width;
  const deltaCenterY = -(clientDy / displayHeight) * rect.height;
  return nudgeFraming(image, base, profile, deltaCenterX, deltaCenterY);
}

/** How the physical panel is mounted. */
export type ScreenMount = "landscape" | "portrait";

export type PreviewControls = {
  readonly mode: MonoRenderMode;
  /** Cover-fit-relative zoom (`1` = fill). */
  readonly zoom: number;
  /** Pan centre in source pixels after `rotation`. */
  readonly centerX: number;
  readonly centerY: number;
  /** Clockwise artwork rotation before framing. */
  readonly rotation: SourceRotation;
  readonly screenMount: ScreenMount;
};

export type PreviewResult = {
  readonly width: number;
  readonly height: number;
  /** PNG data URL of the packed preview (what the panel would show). */
  readonly dataUrl: string;
};

const landscapeProfile = waveshare75BwProfile;

/** Same panel contract with rotate-90 packing for a portrait mount. */
const portraitProfile = defineDisplayProfile({
  id: waveshare75BwProfile.id,
  label: `${waveshare75BwProfile.label} (portrait mount)`,
  width: waveshare75BwProfile.width,
  height: waveshare75BwProfile.height,
  aspectRatio: waveshare75BwProfile.aspectRatio,
  bitsPerPixel: waveshare75BwProfile.bitsPerPixel,
  pixelPacking: waveshare75BwProfile.pixelPacking,
  packedByteLength: waveshare75BwProfile.packedByteLength,
  orientation: "rotate-90",
  polarity: waveshare75BwProfile.polarity,
});

export function profileForMount(mount: ScreenMount) {
  return mount === "portrait" ? portraitProfile : landscapeProfile;
}

/** Logical panel size used for labels (native profile W×H). */
export const PANEL_WIDTH = landscapeProfile.width;
export const PANEL_HEIGHT = landscapeProfile.height;

export function panelSizeLabel(mount: ScreenMount): string {
  if (mount === "portrait") {
    return `${PANEL_HEIGHT} × ${PANEL_WIDTH} · 1-bit e-paper (portrait)`;
  }
  return `${PANEL_WIDTH} × ${PANEL_HEIGHT} · 1-bit e-paper`;
}

/**
 * Decode an uploaded image and run the shared renderer pipeline to a preview
 * data URL. Framing is zoom / centre / rotation — the package owns clamp math.
 */
export async function renderUploadPreview(
  file: File,
  controls: PreviewControls,
): Promise<PreviewResult> {
  const profile = profileForMount(controls.screenMount);
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Canvas 2D is not available in this browser");
    }
    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);

    const decoded = fromRgbaImageData(imageData);
    const framed = normaliseToProfile(decoded, {
      profile,
      rotation: controls.rotation,
      zoom: controls.zoom,
      centerX: controls.centerX,
      centerY: controls.centerY,
    });
    const mono = renderMono(framed, { mode: controls.mode });
    const packed = packMonoBitmap(mono, { profile });
    const preview = toPreviewImage(packed, profile);

    const out = document.createElement("canvas");
    out.width = preview.width;
    out.height = preview.height;
    const outContext = out.getContext("2d");
    if (!outContext) {
      throw new Error("Canvas 2D is not available in this browser");
    }
    outContext.putImageData(
      new ImageData(
        new Uint8ClampedArray(preview.data),
        preview.width,
        preview.height,
      ),
      0,
      0,
    );

    return {
      width: preview.width,
      height: preview.height,
      dataUrl: out.toDataURL("image/png"),
    };
  } finally {
    bitmap.close();
  }
}

/** Read pixel dimensions without running the full pipeline. */
export async function readImageSize(file: File): Promise<ImageSize> {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export const PREVIEW_MODES: readonly {
  value: MonoRenderMode;
  label: string;
}[] = [
  { value: "threshold", label: "Threshold" },
  { value: "atkinson", label: "Atkinson" },
  { value: "floyd-steinberg", label: "Floyd–Steinberg" },
];

export const PANEL_SIZE_LABEL = panelSizeLabel("landscape");
