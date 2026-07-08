"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";

const METRIC_CARDS = (metrics: {
  psnr: number;
  ssim: number;
  mae: number;
  rmse: number;
  processingTimeSeconds: number;
}) => [
  { label: "PSNR", value: `${metrics.psnr.toFixed(2)} dB` },
  { label: "SSIM", value: metrics.ssim.toFixed(3) },
  { label: "MAE", value: metrics.mae.toFixed(3) },
  { label: "RMSE", value: metrics.rmse.toFixed(3) },
  { label: "Processing Time", value: `${metrics.processingTimeSeconds.toFixed(1)}s` },
];

export default function ResultsPage() {
  const result = useAppStore((s) => s.lastResult);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex gap-6">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {!result ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg sm:text-xl font-semibold truncate"
              >
                Dehazing Results: {result.filename}
              </motion.h1>
              <div className="flex gap-2">
                <a
                  href={result.dehazedDataUrl}
                  download={`dehazed-${result.filename}`}
                  className="focus-ring rounded-md bg-accent text-canvas text-xs sm:text-sm font-semibold px-4 py-2 hover:bg-accent/90 transition-colors"
                >
                  Download Dehazed
                </a>
                <Link
                  href="/upload"
                  className="focus-ring rounded-md border border-stroke text-xs sm:text-sm font-semibold px-4 py-2 text-ink hover:bg-strokeSoft transition-colors"
                >
                  Process New Image
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ImagePanel title="Hazy Original Input" src={result.hazyDataUrl} delay={0} />
              <ImagePanel
                title="Predicted Transmission Map"
                subtitle="Beta Visualization in Jet Colormap"
                src={result.transmissionDataUrl}
                delay={0.08}
              />
              <ImagePanel title="Dehazed Output" src={result.dehazedDataUrl} delay={0.16} />
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
              {METRIC_CARDS(result.metrics).map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="rounded-lg border border-stroke bg-panel px-4 py-3"
                >
                  <div className="text-[11px] text-inkMuted">{m.label}:</div>
                  <div className="mt-1 text-lg font-semibold text-accent">{m.value}</div>
                </motion.div>
              ))}
            </div>

            {result.benchmarked && (
              <p className="mt-4 text-[11px] text-inkFaint leading-relaxed max-w-2xl">
                PSNR / SSIM / MAE / RMSE shown above are the model&apos;s averaged benchmark scores on the held-out
                synthetic validation set (no ground-truth clean image exists for your uploaded photo, so these are
                not computed live against it).
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ImagePanel({
  title,
  subtitle,
  src,
  delay,
}: {
  title: string;
  subtitle?: string;
  src: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl2 border border-stroke bg-panel overflow-hidden"
    >
      <div className="px-4 pt-3 pb-2">
        <div className="text-xs sm:text-sm font-semibold text-ink">{title}</div>
        {subtitle && <div className="text-[10px] text-inkFaint mt-0.5">{subtitle}</div>}
      </div>
      <div className="aspect-square bg-strokeSoft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} className="w-full h-full object-cover" />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="text-lg font-semibold">No results yet</div>
      <p className="mt-2 text-sm text-inkMuted max-w-sm">
        Upload a hazy image to see the dehazed output, transmission map, and quality metrics here.
      </p>
      <Link
        href="/upload"
        className="mt-6 focus-ring rounded-md bg-accent text-canvas text-sm font-semibold px-5 py-2.5 hover:bg-accent/90 transition-colors"
      >
        Go to Upload
      </Link>
    </div>
  );
}
