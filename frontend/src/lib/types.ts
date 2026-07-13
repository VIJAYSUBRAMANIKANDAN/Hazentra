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
