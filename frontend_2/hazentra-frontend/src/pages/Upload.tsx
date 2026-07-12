import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileImage, X, CheckCircle2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useAppStore } from "../lib/store";
import { dehazeImage } from "../lib/api";
import type { QueueItem } from "../lib/types";

const ACCEPTED = ["image/jpeg", "image/png", "image/jpg"];
const MAX_IMAGES = 10;

export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const setBatchResults = useAppStore((s) => s.setBatchResults);
  const addBatchResult = useAppStore((s) => s.addBatchResult);

  const runOne = useCallback(
    async (file: File, idx: number) => {
      setQueue((q) => q.map((it, i) => (i === idx ? { ...it, status: "uploading" } : it)));
      try {
        const result = await dehazeImage(file, (pct) => {
          setQueue((q) => q.map((it, i) => (i === idx ? { ...it, progress: pct } : it)));
        });
        setQueue((q) => q.map((it, i) => (i === idx ? { ...it, status: "done", progress: 100 } : it)));
        addBatchResult(result);
      } catch (e) {
        setQueue((q) =>
          q.map((it, i) =>
            i === idx ? { ...it, status: "error", errorMessage: e instanceof Error ? e.message : "Failed" } : it
          )
        );
        setError(e instanceof Error ? e.message : "Processing failed.");
      }
    },
    [addBatchResult]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
      if (incoming.length === 0) {
        setError("Please choose a JPG or PNG image.");
        return;
      }

      setQueue((current) => {
        const isFreshBatch = current.length === 0;
        if (isFreshBatch) setBatchResults([]);

        const remainingSlots = MAX_IMAGES - current.length;
        if (remainingSlots <= 0) {
          setError(`You can process up to ${MAX_IMAGES} images at a time.`);
          return current;
        }
        const accepted = incoming.slice(0, remainingSlots);
        if (incoming.length > accepted.length) {
          setError(
            `Only ${accepted.length} of ${incoming.length} files were added — the limit is ${MAX_IMAGES} images per batch.`
          );
        }

        const startIndex = current.length;
        const newItems: QueueItem[] = accepted.map((file) => ({ file, progress: 0, status: "pending" }));

        // Auto-process each newly added file immediately — no manual "Process" click.
        accepted.forEach((file, i) => {
          void runOne(file, startIndex + i);
        });

        return [...current, ...newItems];
      });
    },
    [runOne, setBatchResults]
  );

  const allDone = queue.length > 0 && queue.every((it) => it.status === "done" || it.status === "error");
  const anyDone = queue.some((it) => it.status === "done");

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex gap-8">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-semibold text-white"
          >
            Upload
          </motion.h1>
          <span className="text-xs text-mist-400">
            {queue.length}/{MAX_IMAGES} images
          </span>
        </div>

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
          className={`rounded-2xl border-2 border-dashed transition-colors bg-ink-900/50 flex flex-col items-center justify-center text-center py-20 px-6 ${
            dragOver ? "border-crystal-400 bg-crystal-500/[0.06]" : "border-ink-600"
          }`}
        >
          <motion.div animate={dragOver ? { y: [-4, 0, -4] } : {}} transition={{ repeat: Infinity, duration: 1.2 }}>
            <UploadCloud className={`w-10 h-10 mb-4 ${dragOver ? "text-crystal-400" : "text-mist-400"}`} />
          </motion.div>
          <div className="text-lg font-semibold text-white">Drag &amp; Drop hazy image</div>
          <div className="mt-1 text-xs text-mist-400">or browse files (JPG, PNG) — up to {MAX_IMAGES} at once</div>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-6 focus-ring rounded-lg bg-crystal-500 text-ink-950 text-sm font-semibold px-5 py-2.5 hover:bg-crystal-400 transition-colors"
          >
            Choose Files
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-red-400">
            {error}
          </motion.div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-white">Queue</div>
            {anyDone && (
              <button
                onClick={() => navigate("/results")}
                className="focus-ring inline-flex items-center gap-1.5 text-xs font-semibold text-crystal-400 border border-crystal-500/30 rounded-lg px-3 py-1.5 hover:bg-crystal-500/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                View results
              </button>
            )}
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {queue.map((item, idx) => (
                <motion.div
                  key={item.file.name + idx}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="rounded-xl border border-ink-700 bg-ink-900/60 p-3 flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-lg bg-ink-800 flex items-center justify-center shrink-0">
                    <FileImage className="w-5 h-5 text-mist-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm truncate text-mist-200">
                        {item.file.name} ({(item.file.size / (1024 * 1024)).toFixed(1)}MB) -{" "}
                        <span className="capitalize text-mist-400">{item.status}</span>
                      </span>
                      <span className="text-xs text-crystal-400 shrink-0">{item.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                      <motion.div
                        className="h-full bg-crystal-500"
                        animate={{ width: `${item.progress}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                      />
                    </div>
                    {item.status === "error" && item.errorMessage && (
                      <div className="mt-1 text-[11px] text-red-400">{item.errorMessage}</div>
                    )}
                  </div>
                  {(item.status === "pending" || item.status === "error") && (
                    <button
                      onClick={() => setQueue((q) => q.filter((_, i) => i !== idx))}
                      className="shrink-0 focus-ring text-mist-400 hover:text-mist-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {queue.length === 0 && (
              <div className="text-xs text-mist-400/70">No files queued yet — add a hazy image above, it starts processing right away.</div>
            )}
          </div>
        </div>

        {allDone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <button
              onClick={() => navigate("/results")}
              className="focus-ring w-full sm:w-auto rounded-lg bg-crystal-500 text-ink-950 text-sm font-semibold px-6 py-3 hover:bg-crystal-400 transition-colors"
            >
              View all results
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
