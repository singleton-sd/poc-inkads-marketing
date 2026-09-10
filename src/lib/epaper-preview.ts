import {
  coverWindowSize,
  defaultFraming,
  defineDisplayProfile,
  fromRgbaImageData,
  nextSourceRotation,
  normaliseToProfile,
  packMonoBitmap,
  renderMono,
  rotatedImageSize,
  sourceRectFromFraming,
  toPreviewImage,
  waveshare75BwProfile,
  type FramingState,
  type ImageSize,
  type MonoRenderMode,
  type SourceRotation,
} from "@singleton-sd/inkads-epaper-renderer";

export type { FramingState, ImageSize, SourceRotation };
export {
  coverWindowSize,
  defaultFraming,
  nextSourceRotation,
  rotatedImageSize,
  sourceRectFromFraming,
};

export type FramingProfileSize = Pick<
  typeof waveshare75BwProfile,
  "width" | "height"
>;

export type FramingPanRoom = {
  readonly west: number;
  readonly east: number;
  readonly north: number;
  readonly south: number;
};

/**
 * Mirror of `@singleton-sd/inkads-epaper-renderer` framing clamp from #42
 * (letterbox pan). Drop this local copy once the package is ≥ the release that
 * exports `framingPanRoom` and the updated `clampFraming`, and pass zoom /
 * centre into `normaliseToProfile` again instead of `sourceRect`.
 */
function centreBounds(
  imageExtent: number,
  windowExtent: number,
): { min: number; max: number } {
  const half = windowExtent / 2;
  const a = half;
  const b = imageExtent - half;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

/** Keep crop windows inside the image; allow offset letterboxing when zoomed out. */
export function clampFraming(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
): FramingState {
  const zoom = Math.max(framing.zoom, 0.05);
  const rect = sourceRectFromFraming(image, { ...framing, zoom }, profile);
  const x = centreBounds(image.width, rect.width);
  const y = centreBounds(image.height, rect.height);
  return {
    zoom,
    centerX: Math.min(Math.max(framing.centerX, x.min), x.max),
    centerY: Math.min(Math.max(framing.centerY, y.min), y.max),
  };
}

/** Remaining pan travel per axis (0 → disable that arrow). */
export function framingPanRoom(
  image: ImageSize,
  framing: FramingState,
  profile: FramingProfileSize,
): FramingPanRoom {
  const clamped = clampFraming(image, framing, profile);
  const rect = sourceRectFromFraming(image, clamped, profile);
  const x = centreBounds(image.width, rect.width);
  const y = centreBounds(image.height, rect.height);
  return {
    west: clamped.centerX - x.min,
    east: x.max - clamped.centerX,
    north: clamped.centerY - y.min,
    south: y.max - clamped.centerY,
  };
}

export type PanDirection = "n" | "s" | "e" | "w";

export type PanFramingOptions = {
  /** Fraction of the current window to shift (default 0.25). */
  readonly step?: number;
};

/**
 * Shift framing by one pan step. Works for crop overflow and for letterboxed
 * (zoomed-out) images sitting inside the panel. No-ops when that axis is at
 * its clamp limit — callers disable those arrows via `framingPanRoom`.
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
  const dx =
    direction === "e"
      ? rect.width * step
      : direction === "w"
        ? -rect.width * step
        : 0;
  const dy =
    direction === "s"
      ? rect.height * step
      : direction === "n"
        ? -rect.height * step
        : 0;
  return clampFraming(
    image,
    {
      ...base,
      centerX: base.centerX + dx,
      centerY: base.centerY + dy,
    },
    profile,
  );
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
 * data URL. Framing uses the letterbox-aware clamp, then passes `sourceRect`
 * so pan offsets are honoured even before the package ships the same clamp.
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
    const size = rotatedImageSize(
      { width: decoded.width, height: decoded.height },
      controls.rotation,
    );
    const framing = clampFraming(
      size,
      {
        zoom: controls.zoom,
        centerX: controls.centerX,
        centerY: controls.centerY,
      },
      landscapeProfile,
    );
    const sourceRect = sourceRectFromFraming(size, framing, landscapeProfile);
    const framed = normaliseToProfile(decoded, {
      profile,
      rotation: controls.rotation,
      sourceRect,
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
