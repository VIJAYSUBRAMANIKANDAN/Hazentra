import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X, CheckCircle2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import DehazeLoader from "../components/DehazeLoader";
import QualityMenu from "../components/QualityMenu";
import { useAppStore } from "../lib/store";
import { dehazeImage, type DehazeJobHandle } from "../lib/api";
import { exportAtQuality, type QualityPreset } from "../lib/upscale";
import type { QueueItem } from "../lib/types";

const ACCEPTED = ["image/jpeg", "image/png", "image/jpg"];
const MAX_IMAGES = 10;
// Browsers cap concurrent connections per site at 6, and the backend is
// running actual model inference for each job on shared CPU — firing all 10
// at once starves both. Running a small batch at a time and queueing the
// rest keeps every job's connection healthy and finishes the whole set
// faster overall than contending for resources all at once.
const MAX_CONCURRENT = 3;

export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const setBatchResults = useAppStore((s) => s.setBatchResults);
  const addBatchResult = useAppStore((s) => s.addBatchResult);
  const jobHandles = useRef<Map<number, DehazeJobHandle>>(new Map());
  const pendingIndices = useRef<number[]>([]);
  const activeCount = useRef(0);
  const filesByIndex = useRef<Map<number, File>>(new Map());

  const startNextInQueue = useCallback(() => {
    while (activeCount.current < MAX_CONCURRENT && pendingIndices.current.length > 0) {
      const idx = pendingIndices.current.shift()!;
      const file = filesByIndex.current.get(idx);
      if (!file) continue;
      activeCount.current += 1;
      void runOneRef.current(file, idx);
    }
  }, []);

  const runOneRef = useRef<(file: File, idx: number) => Promise<void>>(async () => {});

  const runOne = useCallback(
    async (file: File, idx: number) => {
      setQueue((q) =>
        q.map((it, i) => (i === idx ? { ...it, status: "uploading", stage: "Uploading image" } : it))
      );
      const handle = dehazeImage(file, (evt) => {
        setQueue((q) =>
          q.map((it, i) => (i === idx ? { ...it, progress: evt.progress, status: evt.status, stage: evt.stage } : it))
        );
      });
      jobHandles.current.set(idx, handle);
      try {
        const result = await handle.done;
        setQueue((q) =>
          q.map((it, i) => (i === idx ? { ...it, status: "done", progress: 100, stage: "Complete", result } : it))
        );
        addBatchResult(result);
      } catch (e) {
        setQueue((q) =>
          q.map((it, i) =>
            i === idx ? { ...it, status: "error", errorMessage: e instanceof Error ? e.message : "Failed" } : it
          )
        );
        setError(e instanceof Error ? e.message : "Processing failed.");
      } finally {
        jobHandles.current.delete(idx);
        activeCount.current -= 1;
        startNextInQueue();
      }
    },
    [addBatchResult, startNextInQueue]
  );
  runOneRef.current = runOne;

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const all = Array.from(files);
      const incoming = all.filter((f) => ACCEPTED.includes(f.type));
      if (incoming.length === 0) {
        const hasHeic = all.some((f) => /heic|heif/i.test(f.type) || /\.heic$|\.heif$/i.test(f.name));
        setError(
          hasHeic
            ? "That looks like a HEIC/HEIF photo (common on iPhone). Please choose a JPG or PNG instead — in the Photos app, use Share → Save as JPG, or check your camera's format setting."
            : "Please choose a JPG or PNG image."
        );
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
        const newItems: QueueItem[] = accepted.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          progress: 0,
          stage: "Queued",
          status: "pending",
        }));

        // Queue each newly added file — startNextInQueue() only lets
        // MAX_CONCURRENT run at once, queueing the rest automatically.
        accepted.forEach((file, i) => {
          const idx = startIndex + i;
          filesByIndex.current.set(idx, file);
          pendingIndices.current.push(idx);
        });
        startNextInQueue();

        return [...current, ...newItems];
      });
    },
    [startNextInQueue, setBatchResults]
  );

  const removeItem = (idx: number) => {
    jobHandles.current.get(idx)?.cancel();
    jobHandles.current.delete(idx);
    pendingIndices.current = pendingIndices.current.filter((i) => i !== idx);
    filesByIndex.current.delete(idx);
    setQueue((q) => {
      const item = q[idx];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return q.filter((_, i) => i !== idx);
    });
  };

  const downloadOne = async (idx: number, preset: QualityPreset) => {
    const item = queue[idx];
    if (!item?.result) return;
    setDownloadingIdx(idx);
    try {
      const exported = await exportAtQuality(item.result.dehazedDataUrl, preset);
      const a = document.createElement("a");
      a.href = exported;
      a.download = `dehazed-${preset}-${item.result.filename.replace(/\.[^.]+$/, "")}.png`;
      a.click();
    } finally {
      setDownloadingIdx(null);
    }
  };

  const allDone = queue.length > 0 && queue.every((it) => it.status === "done" || it.status === "error");
  const anyDone = queue.some((it) => it.status === "done");

  return (
    <div className="mx-auto max-w-[1680px] px-5 sm:px-8 py-8 flex gap-8">
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
          className={`rounded-2xl border-2 border-dashed transition-colors bg-ink-900/50 flex flex-col items-center justify-center text-center py-16 px-6 ${
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
            // Deliberately NOT display:none (Tailwind's `hidden`). Several
            // mobile browsers (Samsung Internet, older Android WebView,
            // in-app browsers) silently refuse a synthetic .click() on a
            // display:none file input as a security precaution — it has to
            // stay a real, laid-out (if invisible) element for the native
            // picker to open reliably everywhere.
            className="absolute w-px h-px opacity-0 overflow-hidden pointer-events-none"
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              // reset so selecting the exact same file again still fires onChange
              e.target.value = "";
            }}
          />
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-red-400">
            {error}
          </motion.div>
        )}

        {queue.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-white">Queue</div>
              {anyDone && (
                <button
                  onClick={() => navigate("/results")}
                  className="focus-ring inline-flex items-center gap-1.5 text-xs font-semibold text-crystal-400 border border-crystal-500/30 rounded-lg px-3 py-1.5 hover:bg-crystal-500/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  View all in Results
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {queue.map((item, idx) => {
                  const isProcessing =
                    item.status === "queued" || item.status === "uploading" || item.status === "processing";
                  return (
                    <motion.div
                      key={item.file.name + idx}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="rounded-xl border border-ink-700 bg-ink-900/60 overflow-hidden"
                    >
                      <div className="relative aspect-square bg-ink-800">
                        {/* Crossfade: hazy preview underneath, dehazed image fades in on top once done */}
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                            item.status === "done" ? "opacity-0" : "opacity-100"
                          }`}
                        />
                        {item.result && (
                          <img
                            src={item.result.dehazedDataUrl}
                            alt={`${item.file.name} dehazed`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                              item.status === "done" ? "opacity-100" : "opacity-0"
                            }`}
                          />
                        )}

                        {isProcessing && <DehazeLoader progress={item.progress} stage={item.stage} />}

                        {item.status === "done" && (
                          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-crystal-500/90 text-ink-950 text-[10px] font-semibold px-2 py-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </span>
                        )}

                        {(item.status === "pending" || item.status === "error") && (
                          <button
                            onClick={() => removeItem(idx)}
                            className="absolute top-2 right-2 shrink-0 focus-ring rounded-full bg-ink-950/70 p-1.5 text-mist-300 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="p-3 text-center">
                        <div className="text-xs text-mist-200 truncate">{item.file.name}</div>
                        <div className="mt-0.5 text-[11px] text-mist-400">
                          {(item.file.size / (1024 * 1024)).toFixed(2)}MB
                          {isProcessing ? ` · ${item.stage}` : ` · ${item.status}`}
                        </div>
                        {item.status === "error" && item.errorMessage && (
                          <div className="mt-1 text-[11px] text-red-400">{item.errorMessage}</div>
                        )}
                        {item.status === "done" && (
                          <QualityMenu
                            busy={downloadingIdx === idx}
                            onSelect={(preset) => downloadOne(idx, preset)}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {allDone && queue.length > 1 && (
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
