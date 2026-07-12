import type { DehazeResult } from "./types";

// Vite exposes env vars prefixed with VITE_ via import.meta.env (not process.env).
const API_BASE = (import.meta.env.VITE_MODEL_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8000";

export function getApiBase() {
  return API_BASE;
}

export type DehazeStage = "uploading" | "processing";

export async function dehazeImage(
  file: File,
  onProgress?: (pct: number, stage: DehazeStage) => void
): Promise<DehazeResult> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/dehaze`);

    // The upload itself is usually near-instant for small images, so we only
    // give it 0-30% of the bar. The remaining 30-95% is a simulated ramp that
    // fills the time the backend actually spends running the model — without
    // this, the bar hits 100% the moment the bytes are sent and then just
    // sits frozen while the response is still pending, which looks stuck.
    let simInterval: ReturnType<typeof setInterval> | null = null;
    let simPct = 30;

    const startSimulatedProgress = () => {
      onProgress?.(simPct, "processing");
      simInterval = setInterval(() => {
        // Ease off as we approach the cap so it never falsely claims 100%
        // before the response actually arrives.
        const remaining = 95 - simPct;
        simPct += Math.max(0.5, remaining * 0.08);
        if (simPct >= 95) {
          simPct = 95;
          if (simInterval) clearInterval(simInterval);
        }
        onProgress?.(Math.round(simPct), "processing");
      }, 150);
    };

    const stopSimulatedProgress = () => {
      if (simInterval) clearInterval(simInterval);
    };

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const uploadPct = Math.round((e.loaded / e.total) * 30);
        onProgress(uploadPct, "uploading");
      }
    };

    xhr.upload.onload = () => {
      startSimulatedProgress();
    };

    xhr.onload = () => {
      stopSimulatedProgress();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          onProgress?.(100, "processing");
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

    xhr.onerror = () => {
      stopSimulatedProgress();
      reject(new Error("Network error contacting model API"));
    };
    xhr.send(formData);
  });
}
