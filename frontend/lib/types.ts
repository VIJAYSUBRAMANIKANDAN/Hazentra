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
  hazyDataUrl: string;
  transmissionDataUrl: string;
  dehazedDataUrl: string;
  metrics: DehazeMetrics;
  createdAt: string;
  benchmarked: boolean; // true if metrics are dataset-benchmark averages, not live GT comparison
}

export interface QueueItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "done" | "error";
}
