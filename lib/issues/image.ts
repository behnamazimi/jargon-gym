import { MAX_SCREENSHOT_BYTES } from "./schema";

export const MAX_SIDE = 2000;
const QUALITIES = [0.85, 0.7, 0.55, 0.4];
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function isAcceptedImage(file: Blob): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/** Scales a size down so its longest side is at most `maxSide`, keeping the shape. */
export function fitWithin(
  width: number,
  height: number,
  maxSide = MAX_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Re-encodes an image as WebP small enough to send. Null when the browser can't read it. */
export async function shrinkScreenshot(file: Blob): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob || blob.type !== "image/webp") return null;
    if (blob.size <= MAX_SCREENSHOT_BYTES) return blob;
  }
  return null;
}
