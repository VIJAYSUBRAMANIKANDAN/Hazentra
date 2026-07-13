import { useState, useRef, useEffect, useLayoutEffect } from "react";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Runs after the dropdown has actually been painted, so we're measuring
  // its real, current position — not a guessed/hardcoded height. This is
  // what makes it work correctly no matter where the card sits on the page,
  // how many images are queued, or what viewport size it's running at.
  useLayoutEffect(() => {
    if (!open) return;

    // The trigger button keeps browser focus after being clicked. On some
    // browsers a focused element near the bottom of the viewport triggers
    // the browser's OWN automatic "scroll focused element into view"
    // behavior, independent of anything we do — that competing, uncontrolled
    // scroll is what caused two scroll motions to happen at once. Dropping
    // focus immediately removes that, leaving exactly one scroll in our
    // control below.
    buttonRef.current?.blur();

    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const isClipped = rect.bottom > window.innerHeight;

    if (isClipped) {
      // The standard, browser-native way to bring an off-screen element
      // into view — it works correctly regardless of page length, how
      // many cards are above it, or viewport size, because the browser
      // computes the scroll distance itself at the moment it's called.
      // Lenis (when active, on desktop) listens for native scroll events
      // and re-syncs its own internal position automatically, so this
      // never fights or creates a second, separate scroll.
      panel.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
    }
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="w-full focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg bg-crystal-500 text-ink-950 text-xs font-semibold px-3 py-2 hover:bg-crystal-400 transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-lg border border-ink-600 bg-ink-900 shadow-xl"
        >
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
