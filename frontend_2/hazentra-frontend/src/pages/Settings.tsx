import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import { useAppStore } from "../lib/store";
import { getApiBase } from "../lib/api";

export default function Settings() {
  const outputFormat = useAppStore((s) => s.outputFormat);
  const setOutputFormat = useAppStore((s) => s.setOutputFormat);
  const alphaBlending = useAppStore((s) => s.alphaBlending);
  const setAlphaBlending = useAppStore((s) => s.setAlphaBlending);

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex gap-8">
      <Sidebar />
      <div className="flex-1 min-w-0 max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-semibold text-white mb-6"
        >
          Settings &amp; Information
        </motion.h1>

        <Section title="Processing" delay={0}>
          <Row label="Model Version">
            <span className="text-sm text-mist-400">v2.3 (Searchable ViT + NAS Codebook)</span>
          </Row>
          <Row label="Output Format">
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as "PNG" | "JPEG" | "WEBP")}
              className="focus-ring bg-ink-800 border border-ink-600 rounded-md text-sm px-3 py-1.5 text-mist-200"
            >
              <option value="PNG">PNG</option>
              <option value="JPEG">JPEG</option>
              <option value="WEBP">WEBP</option>
            </select>
          </Row>
          <Row label="Alpha Blending">
            <Toggle checked={alphaBlending} onChange={setAlphaBlending} />
          </Row>
        </Section>

        <Section title="Connection" delay={0.08}>
          <Row label="Model API">
            <span className="text-xs text-mist-400 break-all text-right">{getApiBase()}</span>
          </Row>
        </Section>

        <Section title="Application Info" delay={0.16}>
          <div className="text-sm text-mist-400 leading-relaxed">
            Hazentra v1.0
            <br />
            Developed by Clarity Research Lab
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5 mb-5"
    >
      <div className="text-sm font-semibold text-mist-400 mb-3 uppercase tracking-wide">{title}</div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-ink-700/60 last:border-b-0">
      <span className="text-sm text-mist-200">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`focus-ring relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-crystal-500" : "bg-ink-700"}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-ink-950 transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
