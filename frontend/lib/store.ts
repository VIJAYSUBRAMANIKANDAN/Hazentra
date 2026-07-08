"use client";

import { create } from "zustand";
import type { DehazeResult, QueueItem } from "./types";

interface AppState {
  queue: QueueItem[];
  setQueue: (q: QueueItem[]) => void;
  updateQueueItem: (index: number, patch: Partial<QueueItem>) => void;
  lastResult: DehazeResult | null;
  setLastResult: (r: DehazeResult | null) => void;
  history: DehazeResult[];
  addToHistory: (r: DehazeResult) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  outputFormat: "PNG" | "JPEG" | "WEBP";
  setOutputFormat: (v: "PNG" | "JPEG" | "WEBP") => void;
  alphaBlending: boolean;
  setAlphaBlending: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  queue: [],
  setQueue: (q) => set({ queue: q }),
  updateQueueItem: (index, patch) =>
    set((state) => {
      const next = [...state.queue];
      if (next[index]) next[index] = { ...next[index], ...patch };
      return { queue: next };
    }),
  lastResult: null,
  setLastResult: (r) => set({ lastResult: r }),
  history: [],
  addToHistory: (r) => set((state) => ({ history: [r, ...state.history].slice(0, 20) })),
  darkMode: true,
  setDarkMode: (v) => set({ darkMode: v }),
  outputFormat: "PNG",
  setOutputFormat: (v) => set({ outputFormat: v }),
  alphaBlending: false,
  setAlphaBlending: (v) => set({ alphaBlending: v }),
}));
