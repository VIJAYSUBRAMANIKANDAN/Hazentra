"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

export default function HomePage() {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-xl2 border border-stroke bg-panel shadow-panel overflow-hidden"
      >
        {/* Before / after comparison */}
        <div className="relative aspect-[16/7] select-none">
          <div className="absolute inset-0 grid grid-cols-2">
            <div className="relative bg-gradient-to-br from-[#4b5563] to-[#1f2937] flex items-center justify-center">
              <span className="absolute top-3 left-3 text-[11px] font-semibold tracking-wide bg-black/30 px-2 py-1 rounded">
                HAZY CITYSCAPE
              </span>
              <CityscapeSVG hazy />
              <span className="absolute bottom-2 left-3 text-[11px] text-inkMuted">Hazy Original</span>
              <span className="absolute bottom-2 right-3 text-[11px] text-inkFaint">16:9</span>
            </div>
            <div className="relative bg-gradient-to-br from-[#0e7490] to-[#0b2530] flex items-center justify-center">
              <span className="absolute top-3 left-3 text-[11px] font-semibold tracking-wide bg-black/30 px-2 py-1 rounded">
                DEHAZED RESULT
              </span>
              <CityscapeSVG hazy={false} />
              <span className="absolute bottom-2 left-3 text-[11px] text-inkMuted">Dehazed Output</span>
              <span className="absolute bottom-2 right-3 text-[11px] text-inkFaint">16:9</span>
            </div>
          </div>

          {/* Draggable divider (visual only, purely decorative on home) */}
          <motion.div
            className="absolute top-0 bottom-0 w-[2px] bg-white/70 cursor-ew-resize"
            style={{ left: `${sliderPos}%` }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0}
            onDrag={(_, info) => {
              // constrain slider within card bounds using relative movement
              setSliderPos((p) => Math.min(96, Math.max(4, p + info.delta.x / 6)));
            }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
              <span className="text-canvas text-xs">⇔</span>
            </div>
          </motion.div>
        </div>

        {/* Copy + CTAs */}
        <div className="text-center px-6 sm:px-10 py-10 sm:py-12">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight"
          >
            AI-Powered Clarity
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-3 text-sm sm:text-base text-inkMuted max-w-xl mx-auto"
          >
            Enhance hazy images instantly using advanced deep learning.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-7 flex items-center justify-center gap-3"
          >
            <Link
              href="/upload"
              className="focus-ring rounded-md bg-accent text-canvas text-sm font-semibold px-5 py-2.5 hover:bg-accent/90 transition-colors"
            >
              Start Dehazing Now
            </Link>
            <Link
              href="/about"
              className="focus-ring rounded-md border border-stroke text-sm font-semibold px-5 py-2.5 text-ink hover:bg-strokeSoft transition-colors"
            >
              Learn More
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Feature strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { title: "ViT-based beta estimation", desc: "A searchable Vision Transformer predicts per-patch haze density." },
          { title: "NAS codebook retrieval", desc: "K-Means anchored prototypes give stable, generalizable haze estimates." },
          { title: "Physics-guided reconstruction", desc: "Dark-channel atmospheric light + transmission recover the clean scene." },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="rounded-xl2 border border-stroke bg-panel p-5"
          >
            <div className="text-sm font-semibold text-ink">{f.title}</div>
            <div className="mt-1.5 text-xs text-inkMuted leading-relaxed">{f.desc}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function CityscapeSVG({ hazy }: { hazy: boolean }) {
  return (
    <svg viewBox="0 0 400 200" className="w-full h-full opacity-90">
      {[...Array(9)].map((_, i) => {
        const w = 20 + ((i * 37) % 30);
        const h = 60 + ((i * 53) % 100);
        const x = i * 44 + 10;
        return (
          <rect
            key={i}
            x={x}
            y={200 - h}
            width={w}
            height={h}
            fill={hazy ? "#94a3b8" : "#67e8f9"}
            opacity={hazy ? 0.35 - i * 0.01 : 0.85 - i * 0.03}
          />
        );
      })}
    </svg>
  );
}
