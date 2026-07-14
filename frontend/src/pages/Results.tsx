import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import JSZip from "jszip";
import Sidebar from "../components/Sidebar";
import QualityMenu from "../components/QualityMenu";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/toastContext";
import { useAppStore } from "../lib/store";
import { exportAtQuality, imageSrcToBlob, type QualityPreset } from "../lib/upscale";
import type { DehazeResult } from "../lib/types";

export default function Results() {
  const results = useAppStore((s) => s.batchResults);
  const { showToast } = useToast();
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
          <Link to="/upload">
            <Button size="lg" className="mt-6">
              Go to Upload
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  async function downloadSingle(result: DehazeResult, preset: QualityPreset) {
    setDownloadingId(result.id);
    setDownloadError(null);
    try {
      const exported = await exportAtQuality(result.dehazedDataUrl, preset);
      const blob = await imageSrcToBlob(exported);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `dehazed-${preset}-${result.filename.replace(/\.[^.]+$/, "")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke shortly after — not immediately, since some mobile browsers
      // process the download/navigation asynchronously and revoking too
      // early can cancel it.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      showToast(`Download started (${preset})`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't prepare the download — please try again.";
      setDownloadError(message);
      showToast(message, "error");
    } finally {
      setDownloadingId(null);
    }
  }

  async function downloadAll(preset: QualityPreset) {
    setZipping(true);
    setDownloadError(null);
    try {
      const zip = new JSZip();
      for (const result of results) {
        const exported = await exportAtQuality(result.dehazedDataUrl, preset);
        const blob = await imageSrcToBlob(exported);
        zip.file(`dehazed-${preset}-${result.filename.replace(/\.[^.]+$/, "")}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `hazentra-dehazed-${preset}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      showToast(`Download started — ${results.length} images (${preset})`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't prepare the download — please try again.";
      setDownloadError(message);
      showToast(message, "error");
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
              <QualityMenu label="Download all" busy={zipping} onSelect={downloadAll} />
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
            >
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white truncate">{result.filename}</span>
                  {results.length === 1 && (
                    <QualityMenu
                      label="Download dehazed"
                      busy={downloadingId === result.id}
                      onSelect={(preset) => downloadSingle(result, preset)}
                    />
                  )}
                </div>

                <BeforeAfterSlider
                  beforeSrc={result.hazyDataUrl}
                  afterSrc={result.dehazedDataUrl}
                  beforeLabel="Hazy"
                  afterLabel="Dehazed"
                  beforeAlt={`Original hazy version of ${result.filename}`}
                  afterAlt={`Dehazed version of ${result.filename}`}
                  className="max-w-xl mx-auto sm:mx-0"
                />

                {results.length > 1 && (
                  <div className="mt-3 flex justify-end">
                    <QualityMenu
                      label="Download this one"
                      busy={downloadingId === result.id}
                      onSelect={(preset) => downloadSingle(result, preset)}
                    />
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
              </Card>
            </motion.div>
          ))}
        </div>

        {results[0]?.benchmarked && (
          <p className="mt-6 text-[11px] text-mist-400/70 leading-relaxed max-w-2xl">
            PSNR / SSIM / MAE / RMSE are the model&apos;s averaged benchmark scores on the held-out validation
            set — there is no ground-truth clean image for your uploaded photos to compute these live against.
            Downloads are exported at exactly the resolution you choose — from 360p up to full 4K. Drag the
            slider on each image to compare hazy vs. dehazed.
          </p>
        )}
      </div>
    </div>
  );
}
