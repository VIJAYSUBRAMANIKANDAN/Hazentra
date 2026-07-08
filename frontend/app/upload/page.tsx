"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileImage, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import { dehazeImage } from "@/lib/api";
import type { QueueItem } from "@/lib/types";

const ACCEPTED = ["image/jpeg", "image/png", "image/jpg"];

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueueLocal] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const setLastResult = useAppStore((s) => s.setLastResult);
  const addToHistory = useAppStore((s) => s.addToHistory);

  const addFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    const arr = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
    if (arr.length === 0) {
      setError("Please choose a JPG or PNG image.");
      return;
    }
    setQueueLocal((q) => [...q, ...arr.map((file) => ({ file, progress: 0, status: "pending" as const }))]);
  }, []);

  const processQueue = useCallback(
    async (idx: number) => {
      const item = queue[idx];
      if (!item) return;
      setQueueLocal((q) => q.map((it, i) => (i === idx ? { ...it, status: "uploading" } : it)));
      try {
        const result = await dehazeImage(item.file, (pct) => {
          setQueueLocal((q) => q.map((it, i) => (i === idx ? { ...it, progress: pct } : it)));
        });
        setQueueLocal((q) => q.map((it, i) => (i === idx ? { ...it, status: "done", progress: 100 } : it)));
        setLastResult(result);
        addToHistory(result);
        fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: result.filename,
            hazyImageUrl: result.hazyDataUrl,
            transmissionMapUrl: result.transmissionDataUrl,
            dehazedImageUrl: result.dehazedDataUrl,
            psnr: result.metrics.psnr,
            ssim: result.metrics.ssim,
            mae: result.metrics.mae,
            rmse: result.metrics.rmse,
            processingTimeSeconds: result.metrics.processingTimeSeconds,
            benchmarked: result.benchmarked,
          }),
        }).catch(() => {
          /* history persistence is best-effort; ignore failures */
        });
        router.push("/results");
      } catch (e) {
        setQueueLocal((q) => q.map((it, i) => (i === idx ? { ...it, status: "error" } : it)));
        setError(e instanceof Error ? e.message : "Processing failed.");
      }
    },
    [queue, router, setLastResult, addToHistory]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex gap-6">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold mb-5"
        >
          Upload
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl2 border-2 border-dashed transition-colors bg-panel/60 flex flex-col items-center justify-center text-center py-16 px-6 ${
            dragOver ? "border-accent bg-accentSoft/40" : "border-stroke"
          }`}
        >
          <UploadCloud className={`w-10 h-10 mb-4 ${dragOver ? "text-accent" : "text-inkMuted"}`} />
          <div className="text-lg font-semibold">Drag &amp; Drop hazy image</div>
          <div className="mt-1 text-xs text-inkFaint">or browse files (JPG, PNG)</div>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-5 focus-ring rounded-md bg-accent text-canvas text-sm font-semibold px-5 py-2 hover:bg-accent/90 transition-colors"
          >
            Choose File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}

        <div className="mt-8">
          <div className="text-sm font-semibold text-ink mb-3">Queue</div>
          <div className="space-y-3">
            <AnimatePresence>
              {queue.map((item, idx) => (
                <motion.div
                  key={item.file.name + idx}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="rounded-lg border border-stroke bg-panel p-3 flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-md bg-strokeSoft flex items-center justify-center shrink-0">
                    <FileImage className="w-5 h-5 text-inkMuted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm truncate">
                        {item.file.name} ({(item.file.size / (1024 * 1024)).toFixed(1)}MB) -{" "}
                        <span className="capitalize text-inkMuted">{item.status}</span>
                      </span>
                      <span className="text-xs text-accent shrink-0">{item.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-strokeSoft overflow-hidden">
                      <motion.div
                        className="h-full bg-accent"
                        animate={{ width: `${item.progress}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                      />
                    </div>
                  </div>
                  {item.status === "pending" && (
                    <button
                      onClick={() => processQueue(idx)}
                      className="shrink-0 focus-ring text-xs font-semibold text-accent border border-accent/30 rounded-md px-3 py-1.5 hover:bg-accentSoft"
                    >
                      Process
                    </button>
                  )}
                  {item.status === "pending" && (
                    <button
                      onClick={() => setQueueLocal((q) => q.filter((_, i) => i !== idx))}
                      className="shrink-0 focus-ring text-inkFaint hover:text-ink"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {queue.length === 0 && (
              <div className="text-xs text-inkFaint">No files queued yet — add a hazy image above.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
