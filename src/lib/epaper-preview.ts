import {
  fromRgbaImageData,
  normaliseToProfile,
  packMonoBitmap,
  renderMono,
  toPreviewImage,
  waveshare75BwProfile,
  type MonoRenderMode,
  type SourceRect,
} from "@singleton-sd/inkads-epaper-renderer";

export type { SourceRect };

export type PreviewControls = {
  readonly mode: MonoRenderMode;
  /** Explicit region of the upload in source pixels (zoom + pan). */
  readonly sourceRect: SourceRect;
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

const profile = waveshare75BwProfile;

export const PANEL_WIDTH = profile.width;
export const PANEL_HEIGHT = profile.height;

/** Cover-fit window size in source pixels (zoom = 1). */
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

/**
 * Decode an uploaded image in the browser and run the shared renderer pipeline
 * through to a preview data URL. Matches device output for the same options.
 */
export async function renderUploadPreview(
  file: File,
  controls: PreviewControls,
): Promise<PreviewResult> {
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

export const PANEL_SIZE_LABEL = `${profile.width} × ${profile.height}`;
