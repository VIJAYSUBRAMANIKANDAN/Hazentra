"use client";

import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const outputFormat = useAppStore((s) => s.outputFormat);
  const setOutputFormat = useAppStore((s) => s.setOutputFormat);
  const alphaBlending = useAppStore((s) => s.alphaBlending);
  const setAlphaBlending = useAppStore((s) => s.setAlphaBlending);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex gap-6">
      <Sidebar />
      <div className="flex-1 min-w-0 max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold mb-6"
        >
          Settings &amp; Information
        </motion.h1>

        <Section title="Appearance" delay={0}>
          <Row label="Dark Mode">
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </Row>
          <Row label="Theme Color">
            <div className="w-5 h-5 rounded-full bg-accent border border-white/20" />
          </Row>
        </Section>

        <Section title="Processing" delay={0.08}>
          <Row label="Model Version">
            <span className="text-sm text-inkMuted">v2.3 (Searchable ViT + NAS Codebook)</span>
          </Row>
          <Row label="Output Format">
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as "PNG" | "JPEG" | "WEBP")}
              className="focus-ring bg-strokeSoft border border-stroke rounded-md text-sm px-3 py-1.5 text-ink"
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

        <Section title="Application Info" delay={0.16}>
          <div className="text-sm text-inkMuted leading-relaxed">
            Hazentra
            <br />
            Developed by R Vijay Subramanikandan
            <br />
            <a href="/about" className="text-accent hover:underline">
              Help / Documentation
            </a>
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
      className="rounded-xl2 border border-stroke bg-panel p-5 mb-5"
    >
      <div className="text-sm font-semibold text-inkMuted mb-3 uppercase tracking-wide">{title}</div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-stroke last:border-b-0">
      <span className="text-sm text-ink">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`focus-ring relative w-10 h-6 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-strokeSoft"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-canvas transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
