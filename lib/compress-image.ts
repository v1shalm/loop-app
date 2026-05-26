/**
 * Client-side image compression for attachments.
 *
 * Why: Supabase free plan caps total storage at 1 GB. Phone-shot
 * screenshots and photos clock in at 3-5 MB each, so without
 * compression a team would fill the bucket in ~250 attachments.
 * Resizing to 1600px max edge and re-encoding as WebP at q=0.82
 * brings the average image down to 200-400 KB — a 15-20× headroom
 * bump for the same visual fidelity at typical screen sizes.
 *
 * What this is NOT: a generic image processor. It only handles the
 * common path (photo / screenshot / PNG / JPEG). HEIC, SVG, GIF, and
 * other formats fall through untouched — better to upload the
 * original than mangle an unsupported codec.
 */

const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.82;

const COMPRESSIBLE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export interface CompressedImage {
  /** The compressed (or original) blob, ready to upload. */
  blob: Blob;
  /** Final extension for naming. .webp when compression succeeded,
   *  otherwise the original file's extension. */
  extension: string;
  /** Final MIME type. */
  contentType: string;
  /** Whether compression actually ran. Useful for telemetry. */
  compressed: boolean;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  // Fast bail: not an image type we know how to recompress. Hand
  // back the original; the caller decides whether to upload as-is.
  if (!COMPRESSIBLE_TYPES.has(file.type)) {
    return {
      blob: file,
      extension: extractExtension(file.name) ?? "bin",
      contentType: file.type || "application/octet-stream",
      compressed: false,
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitInside(bitmap.width, bitmap.height, MAX_EDGE);

    // If the image is already smaller than MAX_EDGE in both dims AND
    // already under ~400 KB, recompressing is just lossy churn — keep
    // the original.
    if (
      width === bitmap.width &&
      height === bitmap.height &&
      file.size < 400 * 1024
    ) {
      bitmap.close();
      return {
        blob: file,
        extension: extractExtension(file.name) ?? "bin",
        contentType: file.type,
        compressed: false,
      };
    }

    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    if (!blob) throw new Error("encode failed");

    // If WebP ended up larger than the original (rare but happens
    // with already-compressed JPEGs), keep the original.
    if (blob.size >= file.size) {
      return {
        blob: file,
        extension: extractExtension(file.name) ?? "bin",
        contentType: file.type,
        compressed: false,
      };
    }

    return {
      blob,
      extension: "webp",
      contentType: "image/webp",
      compressed: true,
    };
  } catch {
    // Any failure path — codec unsupported by this browser, canvas
    // tainted, OOM — falls back to the original file.
    return {
      blob: file,
      extension: extractExtension(file.name) ?? "bin",
      contentType: file.type || "application/octet-stream",
      compressed: false,
    };
  }
}

function fitInside(w: number, h: number, maxEdge: number) {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  const ratio = w > h ? maxEdge / w : maxEdge / h;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality: number
): Promise<Blob | null> {
  if ("convertToBlob" in canvas) {
    return (canvas as OffscreenCanvas).convertToBlob({ type, quality });
  }
  return new Promise((resolve) =>
    (canvas as HTMLCanvasElement).toBlob(resolve, type, quality)
  );
}

function extractExtension(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}
