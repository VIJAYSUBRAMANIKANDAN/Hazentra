/**
 * Upscales a data-URL image to a 4K-class resolution (3840px on the longest
 * side) using high-quality canvas interpolation before download.
 *
 * Honest caveat: this is smooth interpolation, not the model inventing new
 * detail — it makes the exported file crisp and large enough for print/4K
 * displays without visible pixelation, but it cannot add detail the model's
 * output didn't already contain.
 *
 * Mobile note: phones (especially iOS Safari) enforce much lower canvas
 * memory/dimension ceilings than desktop — a full 3840px canvas can exceed
 * that ceiling and silently produce a blank/corrupted image instead of
 * throwing an error. We detect touch/coarse-pointer devices and cap the
 * target resolution lower there (still noticeably sharper than the raw
 * model output, just not a full 4K canvas that risks failing quietly), and
 * verify the result actually contains image data before trusting it.
 */
const DESKTOP_TARGET_LONG_EDGE = 3840;
const MOBILE_TARGET_LONG_EDGE = 2400;

function isConstrainedDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

export async function upscaleDataUrlTo4K(dataUrl: string): Promise<string> {
  const targetLongEdge = isConstrainedDevice() ? MOBILE_TARGET_LONG_EDGE : DESKTOP_TARGET_LONG_EDGE;

  try {
    const img = await loadImage(dataUrl);
    const { width, height } = img;
    const longEdge = Math.max(width, height);

    if (longEdge >= targetLongEdge) {
      return dataUrl;
    }

    const scale = targetLongEdge / longEdge;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Two-pass upscale (step through an intermediate size) gives noticeably
    // smoother results than a single huge jump with the browser's bilinear/
    // bicubic resampler.
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
