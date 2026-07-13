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

  useEffect(() => {
    if (!open) return;

    // The trigger button keeps browser focus after being clicked, and on
    // several mobile browsers a focused element that's near the bottom of
    // the viewport triggers the browser's OWN automatic "scroll focused
    // element into view" behavior. That happens independently of anything
    // we do, and then fights whatever scroll we might add on top of it —
    // which is exactly the "two scrolls happening" you saw. Removing focus
    // from the trigger button immediately stops the browser from doing
    // that, leaving room for a single, deliberate scroll that we control.
    buttonRef.current?.blur();

    // Wait one frame so the dropdown has actually been laid out (its real
    // height only exists after this render commits), then check whether
    // its lower edge is clipped by the viewport — and if so, perform the
    // one and only scroll needed to reveal it fully.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const viewportBottom = window.innerHeight;
      const overflowBottom = rect.bottom - viewportBottom;

      if (overflowBottom > 0) {
        // Scroll just enough to bring the full menu into view, plus a
        // small breathing-room margin — not all the way to the bottom of
        // the page, so the card itself stays in context on screen too.
        const target = window.scrollY + overflowBottom + 16;
        if (window.__lenis) {
          // Desktop: Lenis owns scroll position internally via its own
          // rAF loop — go through it so it doesn't override/fight a raw
          // native scroll on the next frame.
          window.__lenis.scrollTo(target, { duration: 0.6 });
        } else {
          // Mobile/touch: Lenis is intentionally disabled here, so native
          // smooth scrolling is the correct (and only) mechanism at play.
          window.scrollBy({ top: overflowBottom + 16, behavior: "smooth" });
        }
      }
    });

    return () => cancelAnimationFrame(raf);
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
