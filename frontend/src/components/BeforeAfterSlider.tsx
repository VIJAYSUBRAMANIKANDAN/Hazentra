import { useCallback, useRef, useState } from "react";
import Skeleton from "./ui/Skeleton";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
}

/**
 * Drag the divider to reveal more of the "before" (hazy) or "after"
 * (dehazed) image. Works with mouse drag, touch drag, and — since a drag
 * handle isn't keyboard-operable by default — arrow keys when the handle is
 * focused, so this doesn't regress keyboard accessibility versus the plain
 * side-by-side view it's replacing.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  beforeAlt,
  afterAlt,
  className = "",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50); // percent, 0 = all "before", 100 = all "after"
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const bothLoaded = beforeLoaded && afterLoaded;
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPosition((p) => Math.max(0, p - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPosition((p) => Math.min(100, p + 5));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPosition(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPosition(100);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-xl border border-ink-700 aspect-square bg-ink-800 touch-none ${className}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img
        src={beforeSrc}
        alt={beforeAlt}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        onLoad={() => setBeforeLoaded(true)}
      />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img
          src={afterSrc}
          alt={afterAlt}
          className="w-full h-full object-cover"
          draggable={false}
          onLoad={() => setAfterLoaded(true)}
        />
      </div>

      {!bothLoaded && <Skeleton className="absolute inset-0" />}

      <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-wide bg-ink-950/70 text-mist-300 rounded px-2 py-1 pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold uppercase tracking-wide bg-ink-950/70 text-crystal-300 rounded px-2 py-1 pointer-events-none">
        {afterLabel}
      </span>

      <div
        className="absolute inset-y-0 w-0.5 bg-white/80 pointer-events-none"
        style={{ left: `${position}%` }}
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Comparison position: drag or use arrow keys to reveal more of the ${beforeLabel.toLowerCase()} or ${afterLabel.toLowerCase()} image`}
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="focus-ring absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center cursor-ew-resize"
        style={{ left: `${position}%` }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M4 3L1 7l3 4M10 3l3 4-3 4" stroke="#0A0F16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
