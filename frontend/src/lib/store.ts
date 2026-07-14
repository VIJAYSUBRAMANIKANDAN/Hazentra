import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { DehazeResult, QueueItem } from "./types";

interface AppState {
  queue: QueueItem[];
  setQueue: (q: QueueItem[]) => void;
  updateQueueItem: (index: number, patch: Partial<QueueItem>) => void;
  batchResults: DehazeResult[];
  setBatchResults: (r: DehazeResult[]) => void;
  addBatchResult: (r: DehazeResult) => void;
  outputFormat: "PNG" | "JPEG" | "WEBP";
  setOutputFormat: (v: "PNG" | "JPEG" | "WEBP") => void;
  alphaBlending: boolean;
  setAlphaBlending: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        queue: [],
        setQueue: (q) => set({ queue: q }),
        updateQueueItem: (index, patch) =>
          set((state) => {
            const next = [...state.queue];
            if (next[index]) next[index] = { ...next[index], ...patch };
            return { queue: next };
          }),
        batchResults: [],
        setBatchResults: (r) => set({ batchResults: r }),
        addBatchResult: (r) => set((state) => ({ batchResults: [...state.batchResults, r] })),
        outputFormat: "PNG",
        setOutputFormat: (v) => set({ outputFormat: v }),
        alphaBlending: false,
        setAlphaBlending: (v) => set({ alphaBlending: v }),
      }),
      {
        name: "hazentra-prefs",
        // Only persist small user preferences. `queue`/`batchResults` hold
        // full-size base64 image data (up to 10 images per batch) — that
        // would blow past localStorage's ~5MB quota almost immediately and
        // there's no reason a page refresh should try to restore an
        // in-flight or stale image queue anyway.
        partialize: (state) => ({
          outputFormat: state.outputFormat,
          alphaBlending: state.alphaBlending,
        }),
      }
    ),
    { name: "hazentra-store", enabled: import.meta.env.DEV }
  )
);
