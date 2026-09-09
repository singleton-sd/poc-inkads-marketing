import {
  fromRgbaImageData,
  normaliseToProfile,
  packMonoBitmap,
  renderMono,
  toPreviewImage,
  waveshare75BwProfile,
  type MonoRenderMode,
} from "@singleton-sd/inkads-epaper-renderer";

export type PreviewControls = {
  readonly mode: MonoRenderMode;
  /** Cover-fit pan, 0–1. */
  readonly cropX: number;
  readonly cropY: number;
};

export type PreviewResult = {
  readonly width: number;
  readonly height: number;
  /** PNG data URL of the packed preview (what the panel would show). */
  readonly dataUrl: string;
};

const profile = waveshare75BwProfile;

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
      crop: { x: controls.cropX, y: controls.cropY },
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

export const PREVIEW_MODES: readonly {
  value: MonoRenderMode;
  label: string;
}[] = [
  { value: "threshold", label: "Threshold" },
  { value: "atkinson", label: "Atkinson" },
  { value: "floyd-steinberg", label: "Floyd–Steinberg" },
];

export const PANEL_SIZE_LABEL = `${profile.width} × ${profile.height}`;
