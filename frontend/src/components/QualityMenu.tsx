import { useState, useRef, useEffect } from "react";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { QUALITY_PRESETS, type QualityPreset } from "../lib/upscale";

export default function QualityMenu({
  label = "Download",
  busy,
  onSelect,
  className = "",
}: {
  label?: string;
  busy: boolean;
  onSelect: (preset: QualityPreset) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="w-full focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg bg-crystal-500 text-ink-950 text-xs font-semibold px-3 py-2 hover:bg-crystal-400 transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-lg border border-ink-600 bg-ink-900 shadow-xl">
          {QUALITY_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setOpen(false);
                onSelect(p.id);
              }}
              className="block w-full px-3 py-2 text-left text-xs text-mist-200 hover:bg-ink-800 hover:text-white transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
