export interface DehazeMetrics {
  psnr: number;
  ssim: number;
  mae: number;
  rmse: number;
  processingTimeSeconds: number;
}

export interface DehazeResult {
  id: string;
  filename: string;
  /** Despite the name, these are now plain http(s) URLs pointing at the
   * backend's GET /api/v1/dehaze/jobs/{id}/image/{kind} endpoint, not
   * embedded base64 `data:` URLs — kept the field names to avoid touching
   * every call site, since `<img src>` and the upscale/download helpers in
   * lib/upscale.ts both work the same either way. */
  hazyDataUrl: string;
  transmissionDataUrl: string;
  dehazedDataUrl: string;
  metrics: DehazeMetrics;
  createdAt: string;
  benchmarked: boolean;
}

export type QueueStatus = "pending" | "queued" | "uploading" | "processing" | "done" | "error";

export interface QueueItem {
  file: File;
  previewUrl: string;
  progress: number;
  stage: string;
  status: QueueStatus;
  result?: DehazeResult;
  errorMessage?: string;
}
