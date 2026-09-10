import {
  defineDisplayProfile,
  fromRgbaImageData,
  normaliseToProfile,
  packMonoBitmap,
  renderMono,
  toPreviewImage,
  waveshare75BwProfile,
  type MonoRenderMode,
  type SourceRect,
  type SourceRotation,
} from "@singleton-sd/inkads-epaper-renderer";

export type { SourceRect, SourceRotation };

/** How the physical panel is mounted. */
export type ScreenMount = "landscape" | "portrait";

export type PreviewControls = {
  readonly mode: MonoRenderMode;
  /** Explicit region of the (post-rotation) upload in source pixels. */
  readonly sourceRect: SourceRect;
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

export type ImageSize = {
  readonly width: number;
  readonly height: number;
};

/** Framing state: zoom 1 = cover-fit; >1 zooms in; <1 zooms out / letterbox. */
export type FramingState = {
  readonly centerX: number;
  readonly centerY: number;
  readonly zoom: number;
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

/** Logical panel size used for cover-fit (always native profile W×H). */
export const PANEL_WIDTH = landscapeProfile.width;
export const PANEL_HEIGHT = landscapeProfile.height;

export const NEXT_ROTATION: Record<SourceRotation, SourceRotation> = {
  0: 90,
  90: 180,
  180: 270,
  270: 0,
};

/** Source dimensions after clockwise rotation (framing space). */
export function rotatedImageSize(
  image: ImageSize,
  rotation: SourceRotation,
): ImageSize {
  if (rotation === 90 || rotation === 270) {
    return { width: image.height, height: image.width };
  }
  return image;
}

/** Cover-fit window size in rotated-source pixels (zoom = 1). */
export function coverWindowSize(image: ImageSize): {
  width: number;
  height: number;
} {
  const scale = Math.max(
    PANEL_WIDTH / image.width,
    PANEL_HEIGHT / image.height,
  );
  return {
    width: PANEL_WIDTH / scale,
    height: PANEL_HEIGHT / scale,
  };
}

/** Centre the cover-fit window on the image. */
export function defaultFraming(image: ImageSize): FramingState {
  return {
    centerX: image.width / 2,
    centerY: image.height / 2,
    zoom: 1,
  };
}

export function sourceRectFromFraming(
  image: ImageSize,
  framing: FramingState,
): SourceRect {
  const cover = coverWindowSize(image);
  const zoom = Math.max(framing.zoom, 0.05);
  const width = cover.width / zoom;
  const height = cover.height / zoom;
  return {
    x: framing.centerX - width / 2,
    y: framing.centerY - height / 2,
    width,
    height,
  };
}

export function panelSizeLabel(mount: ScreenMount): string {
  if (mount === "portrait") {
    return `${PANEL_HEIGHT} × ${PANEL_WIDTH} · 1-bit e-paper (portrait)`;
  }
  return `${PANEL_WIDTH} × ${PANEL_HEIGHT} · 1-bit e-paper`;
}

/**
 * Decode an uploaded image in the browser and run the shared renderer pipeline
 * through to a preview data URL. Matches device output for the same options.
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
      sourceRect: controls.sourceRect,
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
