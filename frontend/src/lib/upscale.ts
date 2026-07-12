/**
 * Upscales a data-URL image to a 4K-class resolution (3840px on the longest
 * side) using high-quality canvas interpolation before download.
 *
 * Honest caveat: this is smooth interpolation, not the model inventing new
 * detail — it makes the exported file crisp and large enough for print/4K
 * displays without visible pixelation, but it cannot add detail the model's
 * output didn't already contain.
 */
const TARGET_LONG_EDGE = 3840;

export async function upscaleDataUrlTo4K(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const { width, height } = img;
  const longEdge = Math.max(width, height);

  if (longEdge >= TARGET_LONG_EDGE) {
    return dataUrl;
  }

  const scale = TARGET_LONG_EDGE / longEdge;
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

  return canvas.toDataURL("image/png", 1.0);
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
