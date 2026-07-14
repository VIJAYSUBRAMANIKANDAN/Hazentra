/**
 * Exports a data-URL image resized to an exact target quality/resolution —
 * downscale or upscale, whichever the preset requires — so a 360p download
 * is genuinely 360p and a 4K download is genuinely 4K, not just the same
 * file with a different label.
 *
 * Honest caveat: upscaling is smooth interpolation, not the model inventing
 * new detail — it makes the exported file crisp and correctly sized without
 * visible pixelation, but it cannot add detail the model's output didn't
 * already contain. Downscaling is a straightforward, lossless-in-spirit
 * resize.
 *
 * Mobile note: phones (especially iOS Safari) enforce much lower canvas
 * memory/dimension ceilings than desktop — a full 3840px canvas can exceed
 * that ceiling and silently produce a blank/corrupted image instead of
 * throwing an error. We cap the target resolution lower on constrained
 * devices for the two largest presets, and verify the result actually
 * contains image data before trusting it.
 */
export type QualityPreset = "360p" | "480p" | "720p" | "1080p" | "4k";

export const QUALITY_PRESETS: { id: QualityPreset; label: string; height: number }[] = [
  { id: "360p", label: "360p", height: 360 },
  { id: "480p", label: "480p (SD)", height: 480 },
  { id: "720p", label: "720p (HD)", height: 720 },
  { id: "1080p", label: "1080p (Full HD)", height: 1080 },
  { id: "4k", label: "4K (Ultra HD)", height: 2160 },
];

const MOBILE_HEIGHT_CAP = 2400;

function isConstrainedDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

export async function exportAtQuality(dataUrl: string, preset: QualityPreset): Promise<string> {
  const presetDef = QUALITY_PRESETS.find((p) => p.id === preset);
  if (!presetDef) return dataUrl;

  let targetHeight = presetDef.height;
  if (isConstrainedDevice() && targetHeight > MOBILE_HEIGHT_CAP) {
    targetHeight = MOBILE_HEIGHT_CAP;
  }

  try {
    const img = await loadImage(dataUrl);
    const { width, height } = img;
    if (height === targetHeight) return dataUrl;

    const scale = targetHeight / height;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (scale > 1) {
      // Upscaling: two-pass through an intermediate size gives noticeably
      // smoother results than a single huge jump with the browser's
      // bilinear/bicubic resampler.
      const midW = Math.round(width * Math.sqrt(scale));
      const midH = Math.round(height * Math.sqrt(scale));
      const mid = document.createElement("canvas");
      mid.width = midW;
      mid.height = midH;
      const midCtx = mid.getContext("2d");
      if (midCtx) {
        midCtx.imageSmoothingEnabled = true;
        midCtx.imageSmoothingQuality = "high";
        midCtx.drawImage(img, 0, 0, midW, midH);
        ctx.drawImage(mid, 0, 0, targetW, targetH);
      } else {
        ctx.drawImage(img, 0, 0, targetW, targetH);
      }
    } else {
      // Downscaling: a single high-quality pass is sufficient and cheaper.
      ctx.drawImage(img, 0, 0, targetW, targetH);
    }

    const result = canvas.toDataURL("image/png", 1.0);

    // Some mobile browsers hit an internal memory ceiling and return a
    // valid-looking but blank/tainted canvas instead of throwing. A data
    // URL that's suspiciously short for its claimed resolution is a strong
    // signal of that — fall back to the original image rather than hand
    // back a broken file.
    if (!result || result === "data:," || result.length < 1000) {
      return dataUrl;
    }
    return result;
  } catch {
    // Any failure here (memory ceiling, decode error, canvas security
    // error, etc.) should never break the download entirely — fall back
    // to the original, already-valid image instead.
    return dataUrl;
  }
}

/** @deprecated Use exportAtQuality(dataUrl, "4k") instead. Kept so any
 * existing callers don't break. */
export async function upscaleDataUrlTo4K(dataUrl: string): Promise<string> {
  return exportAtQuality(dataUrl, "4k");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Result images are now served from the backend's own origin
    // (e.g. localhost:8000) rather than embedded as data: URLs, so the
    // canvas operations below would otherwise "taint" the canvas and throw
    // a SecurityError on toDataURL(). The backend's CORS middleware already
    // allows the frontend's origin, so requesting anonymous cross-origin
    // access here is sufficient. Data URLs ignore this attribute entirely,
    // so it's always safe to set.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Converts an image source to a Blob for download. Handles both cases:
 * - a `data:` URL (what exportAtQuality returns after actually resizing an
 *   image through canvas)
 * - a plain `http(s):` URL (what a result image is by default now — it's
 *   served from the backend's /image/{kind} endpoint rather than embedded,
 *   so no resize was needed and there's nothing to decode locally)
 */
export async function imageSrcToBlob(src: string): Promise<Blob> {
  if (!src.startsWith("data:")) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch image for download: ${res.status}`);
    return res.blob();
  }
  const [header, base64] = src.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** @deprecated Use imageSrcToBlob instead — kept only for source
 * compatibility with any external callers; note this one only handles
 * `data:` URLs and will throw on a plain http(s) URL. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
