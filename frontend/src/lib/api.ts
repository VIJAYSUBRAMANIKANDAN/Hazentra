import type { DehazeResult } from "./types";

// Vite exposes env vars prefixed with VITE_ via import.meta.env (not process.env).
const API_BASE = (import.meta.env.VITE_MODEL_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8000";

export function getApiBase() {
  return API_BASE;
}

export type DehazeProgressEvent = {
  status: "queued" | "uploading" | "processing" | "done" | "error";
  progress: number;
  stage: string;
};

export type DehazeJobHandle = {
  /** Resolves with the finished result, or rejects if the job errors. */
  done: Promise<DehazeResult>;
  /** Stops listening (e.g. if the user removes the item mid-processing). */
  cancel: () => void;
};

/**
 * Uploads the file, then opens a Server-Sent Events stream to the backend
 * job and forwards every real progress checkpoint as it happens — these are
 * not simulated ticks, each one corresponds to a pipeline stage the backend
 * has actually finished (feature extraction, patch retrieval, refinement,
 * transmission mapping, compositing, etc).
 */
export function dehazeImage(
  file: File,
  onProgress?: (event: DehazeProgressEvent) => void
): DehazeJobHandle {
  let cancelled = false;
  let eventSource: EventSource | null = null;

  const done = (async () => {
    // 1. Upload the file and get a job id back immediately.
    const formData = new FormData();
    formData.append("file", file);
    onProgress?.({ status: "uploading", progress: 2, stage: "Uploading image" });

    const createRes = await fetch(`${API_BASE}/api/dehaze/jobs`, {
      method: "POST",
      body: formData,
    });
    if (!createRes.ok) {
      const detail = await createRes.text().catch(() => "");
      throw new Error(`Upload failed: ${createRes.status} ${detail}`.trim());
    }
    const { job_id: jobId } = (await createRes.json()) as { job_id: string };
    if (cancelled) throw new Error("cancelled");

    // 2. Stream real progress from the backend until it's done or errors.
    return await new Promise<DehazeResult>((resolve, reject) => {
      eventSource = new EventSource(`${API_BASE}/api/dehaze/jobs/${jobId}/stream`);

      // The browser's EventSource already auto-reconnects on its own after a
      // transient network blip — closing/rejecting on the first "error"
      // event turns a brief hiccup (common when several jobs' connections
      // are competing for the browser's per-origin connection limit) into a
      // permanent failure. Instead we only give up if we genuinely hear
      // nothing at all for STALL_TIMEOUT_MS, which is a real dead
      // connection rather than a momentary retry.
      const STALL_TIMEOUT_MS = 45_000;
      let stallTimer: ReturnType<typeof setTimeout>;
      const resetStallTimer = () => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          eventSource?.close();
          reject(new Error("Lost connection to the dehazing server."));
        }, STALL_TIMEOUT_MS);
      };
      resetStallTimer();

      eventSource.onmessage = (msg) => {
        resetStallTimer();
        const data = JSON.parse(msg.data) as {
          status: DehazeProgressEvent["status"];
          progress: number;
          stage: string;
          result?: Record<string, unknown>;
          error?: string;
        };

        if (data.status === "error") {
          clearTimeout(stallTimer);
          eventSource?.close();
          reject(new Error(data.error || "Dehazing failed"));
          return;
        }

        onProgress?.({ status: data.status, progress: data.progress, stage: data.stage });

        if (data.status === "done" && data.result) {
          clearTimeout(stallTimer);
          eventSource?.close();
          const r = data.result as {
            id: string;
            hazy_image: string;
            transmission_map: string;
            dehazed_image: string;
            metrics: {
              psnr: number;
              ssim: number;
              mae: number;
              rmse: number;
              processing_time_seconds: number;
            };
            benchmarked?: boolean;
          };
          resolve({
            id: r.id,
            filename: file.name,
            hazyDataUrl: r.hazy_image,
            transmissionDataUrl: r.transmission_map,
            dehazedDataUrl: r.dehazed_image,
            metrics: {
              psnr: r.metrics.psnr,
              ssim: r.metrics.ssim,
              mae: r.metrics.mae,
              rmse: r.metrics.rmse,
              processingTimeSeconds: r.metrics.processing_time_seconds,
            },
            createdAt: new Date().toISOString(),
            benchmarked: r.benchmarked ?? true,
          });
        }
      };

      // Just log-worthy transient errors pass through silently — the browser
      // retries the connection itself. We don't reject here at all; the
      // stall timer above is the only thing that gives up.
      eventSource.onerror = () => {
        if (cancelled) {
          eventSource?.close();
        }
      };
    });
  })();

  return {
    done,
    cancel: () => {
      cancelled = true;
      eventSource?.close();
    },
  };
}
