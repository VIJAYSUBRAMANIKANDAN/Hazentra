import type { DehazeResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_MODEL_API_URL || "http://localhost:8000";

export async function dehazeImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<DehazeResult> {
  const formData = new FormData();
  formData.append("file", file);

  // Use XHR instead of fetch so we get real upload progress events.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/dehaze`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            id: data.id,
            filename: file.name,
            hazyDataUrl: data.hazy_image,
            transmissionDataUrl: data.transmission_map,
            dehazedDataUrl: data.dehazed_image,
            metrics: {
              psnr: data.metrics.psnr,
              ssim: data.metrics.ssim,
              mae: data.metrics.mae,
              rmse: data.metrics.rmse,
              processingTimeSeconds: data.metrics.processing_time_seconds,
            },
            createdAt: new Date().toISOString(),
            benchmarked: data.benchmarked ?? true,
          });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Dehazing failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error contacting model API"));
    xhr.send(formData);
  });
}
