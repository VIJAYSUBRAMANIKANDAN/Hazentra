import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import JSZip from "jszip";
import { Download, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useAppStore } from "../lib/store";
import { upscaleDataUrlTo4K, dataUrlToBlob } from "../lib/upscale";
import type { DehazeResult } from "../lib/types";

export default function Results() {
  const results = useAppStore((s) => s.batchResults);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-[1680px] px-5 sm:px-8 py-8 flex gap-8">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
          <div className="text-lg font-semibold text-white">No results yet</div>
          <p className="mt-2 text-sm text-mist-400 max-w-sm">
            Upload one or more hazy images to see the dehazed output and quality metrics here.
          </p>
          <Link
            to="/upload"
            className="mt-6 focus-ring rounded-lg bg-crystal-500 text-ink-950 text-sm font-semibold px-5 py-2.5 hover:bg-crystal-400 transition-colors"
          >
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  async function downloadSingle(result: DehazeResult) {
    setDownloadingId(result.id);
    setDownloadError(null);
    try {
      const hiRes = await upscaleDataUrlTo4K(result.dehazedDataUrl);
      const blob = dataUrlToBlob(hiRes);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `dehazed-4k-${result.filename.replace(/\.[^.]+$/, "")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke shortly after — not immediately, since some mobile browsers
      // process the download/navigation asynchronously and revoking too
      // early can cancel it.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Couldn't prepare the download — please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function downloadAll() {
    setZipping(true);
    setDownloadError(null);
    try {
      const zip = new JSZip();
      for (const result of results) {
        const hiRes = await upscaleDataUrlTo4K(result.dehazedDataUrl);
        const blob = dataUrlToBlob(hiRes);
        zip.file(`dehazed-4k-${result.filename.replace(/\.[^.]+$/, "")}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "hazentra-dehazed-images.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Couldn't prepare the download — please try again.");
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1680px] px-5 sm:px-8 py-8 flex gap-8">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-lg sm:text-xl font-semibold text-white"
          >
            Results {results.length > 1 ? `(${results.length} images)` : ""}
          </motion.h1>
          <div className="flex gap-2">
            {results.length > 1 && (
              <button
                onClick={downloadAll}
                disabled={zipping}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-crystal-500 text-ink-950 text-xs sm:text-sm font-semibold px-4 py-2 hover:bg-crystal-400 transition-colors disabled:opacity-60"
              >
                {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download all (4K)
              </button>
            )}
            <Link
              to="/upload"
              className="focus-ring rounded-lg border border-ink-600 text-xs sm:text-sm font-semibold px-4 py-2 text-mist-300 hover:bg-ink-800 transition-colors"
            >
              New image
            </Link>
          </div>
        </div>

        {downloadError && (
          <div className="mb-4 text-xs text-red-400">{downloadError}</div>
        )}

        <div className="space-y-8">
          {results.map((result, i) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-ink-700 bg-ink-900/40 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white truncate">{result.filename}</span>
                {results.length === 1 && (
                  <button
                    onClick={() => downloadSingle(result)}
                    disabled={downloadingId === result.id}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-crystal-500 text-ink-950 text-xs font-semibold px-4 py-2 hover:bg-crystal-400 transition-colors disabled:opacity-60"
                  >
                    {downloadingId === result.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download dehazed (4K)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImagePanel title="Original (hazy)" src={result.hazyDataUrl} />
                <ImagePanel title="Dehazed" src={result.dehazedDataUrl} accent />
              </div>

              {results.length > 1 && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => downloadSingle(result)}
                    disabled={downloadingId === result.id}
                    className="focus-ring inline-flex items-center gap-1.5 text-xs font-semibold text-crystal-400 border border-crystal-500/30 rounded-lg px-3 py-1.5 hover:bg-crystal-500/10 disabled:opacity-60"
                  >
                    {downloadingId === result.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download this one (4K)
                  </button>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { label: "PSNR", value: `${result.metrics.psnr.toFixed(2)} dB` },
                  { label: "SSIM", value: result.metrics.ssim.toFixed(3) },
                  { label: "MAE", value: result.metrics.mae.toFixed(3) },
                  { label: "RMSE", value: result.metrics.rmse.toFixed(3) },
                  { label: "Time", value: `${result.metrics.processingTimeSeconds.toFixed(1)}s` },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2">
                    <div className="text-[10px] text-mist-400">{m.label}</div>
                    <div className="mt-0.5 text-sm font-semibold text-crystal-400">{m.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {results[0]?.benchmarked && (
          <p className="mt-6 text-[11px] text-mist-400/70 leading-relaxed max-w-2xl">
            PSNR / SSIM / MAE / RMSE are the model&apos;s averaged benchmark scores on the held-out validation
            set — there is no ground-truth clean image for your uploaded photos to compute these live against.
            Downloaded images are upscaled to 4K (3840px) resolution for crisp, print-ready output.
          </p>
        )}
      </div>
    </div>
  );
}

function ImagePanel({ title, src, accent }: { title: string; src: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border overflow-hidden ${accent ? "border-crystal-500/30" : "border-ink-700"}`}>
      <div className="px-3 pt-2.5 pb-2">
        <div className={`text-xs font-semibold ${accent ? "text-crystal-400" : "text-mist-300"}`}>{title}</div>
      </div>
      <div className="aspect-square bg-ink-800">
        <img src={src} alt={title} className="w-full h-full object-cover" />
      </div>
    </div>
  );
}
