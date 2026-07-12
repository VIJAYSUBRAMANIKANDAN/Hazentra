import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";

export default function About() {
  return (
    <div className="mx-auto max-w-[1680px] px-5 sm:px-8 py-8 flex gap-8">
      <Sidebar />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 min-w-0 max-w-2xl rounded-2xl border border-ink-700 bg-ink-900/60 p-6"
      >
        <h1 className="font-display text-xl font-semibold text-white mb-3">About Hazentra</h1>
        <p className="text-sm text-mist-400 leading-relaxed">
          Hazentra removes atmospheric haze from photographs using a Searchable Vision Transformer
          that predicts a per-patch scattering coefficient (beta), refines it against a Neural
          Architecture Search codebook built from clustered prototypes, and reconstructs the clean
          scene using dark-channel atmospheric light estimation and the physical haze formation model.
        </p>
        <div className="mt-6 space-y-2 text-sm text-mist-400">
          <div>Encoder: ViT-Small/16, 384-dim patch tokens</div>
          <div>Codebook: K-Means NAS search</div>
          <div>Refiner: MLP + CNN spatial correction network</div>
          <div>Reconstruction: Dark-channel prior + atmospheric light</div>
        </div>
      </motion.div>
    </div>
  );
}
