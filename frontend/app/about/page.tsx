"use client";

import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex gap-6">
      <Sidebar />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 min-w-0 max-w-2xl rounded-xl2 border border-stroke bg-panel p-6"
      >
        <h1 className="text-xl font-semibold mb-3">About Hazentra</h1>
        <p className="text-sm text-inkMuted leading-relaxed">
         Hazentra is an advanced image dehazing platform designed to restore clear, natural-looking images from hazy scenes. By combining Vision Transformer (ViT) technology, intelligent feature learning, and physics-based image reconstruction, Hazentra enhances image clarity while preserving important details. Whether for research, photography, or real-world applications, Hazentra delivers fast, accurate, and reliable image restoration through a seamless web experience.
        </p>
        <div className="mt-6 space-y-2 text-sm text-inkMuted">
          <div>Encoder: ViT-Small/16 (timm, 384-dim patch tokens)</div>
          <div>Codebook: K-Means NAS search over K ∈ {"{8, 16, 32}"}</div>
          <div>Refiner: MLP + CNN spatial correction network</div>
          <div>Reconstruction: Dark-channel prior + per-channel atmospheric light</div>
        </div>
      </motion.div>
    </div>
  );
}
