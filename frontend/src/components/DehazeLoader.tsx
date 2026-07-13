import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, ScanEye, Waypoints, Wand2, Gauge, Layers3, Sparkles, UploadCloud, Loader2 } from "lucide-react";

const STAGE_ICONS: [RegExp, React.ComponentType<{ className?: string }>][] = [
  [/upload/i, UploadCloud],
  [/loading model/i, Cpu],
  [/decoding|preparing/i, Layers3],
  [/extracting/i, ScanEye],
  [/matching/i, Waypoints],
  [/refining/i, Wand2],
  [/atmospheric|transmission/i, Gauge],
  [/compositing/i, Layers3],
  [/finaliz/i, Sparkles],
];

function iconForStage(stage: string) {
  const match = STAGE_ICONS.find(([re]) => re.test(stage));
  return match ? match[1] : Loader2;
}

// A handful of ambient floating particles for depth. Purely decorative,
// fixed positions so they don't shift layout or fight the progress ring.
const PARTICLES = [
  { top: "12%", left: "18%", delay: 0 },
  { top: "22%", left: "78%", delay: 0.6 },
  { top: "72%", left: "14%", delay: 1.1 },
  { top: "80%", left: "70%", delay: 0.3 },
  { top: "50%", left: "88%", delay: 1.6 },
  { top: "40%", left: "8%", delay: 0.9 },
];

export default function DehazeLoader({ progress, stage }: { progress: number; stage: string }) {
  // Smoothly displayed percentage: CSS-transitions between the real backend
  // values as they arrive, rather than fabricating intermediate numbers.
  const [display, setDisplay] = useState(progress);
  useEffect(() => {
    setDisplay(progress);
  }, [progress]);

  const Icon = useMemo(() => iconForStage(stage), [stage]);
  const clamped = Math.max(0, Math.min(100, display));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-ink-950/60 backdrop-blur-md">
      {/* ambient particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-crystal-300/70"
          style={{ top: p.top, left: p.left }}
          animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -6, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}

      {/* rotating conic-gradient glow behind the ring for a modern, layered feel */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute h-24 w-24 rounded-full opacity-40 blur-xl"
          style={{
            background: "conic-gradient(from 0deg, #22D3EE, #A78BFA, #34D399, #22D3EE)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* glassmorphic progress ring, percentage driven by conic-gradient sweep */}
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full transition-[background] duration-300 ease-out"
          style={{
            background: `conic-gradient(#5EEAD4 ${clamped * 3.6}deg, rgba(255,255,255,0.08) ${clamped * 3.6}deg)`,
          }}
        >
          <div className="flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-ink-950/80 backdrop-blur-sm border border-white/10">
            <span
              className="bg-gradient-to-br from-crystal-300 via-violet-300 to-emerald-300 bg-clip-text text-lg font-bold text-transparent tabular-nums transition-all duration-300"
            >
              {Math.round(clamped)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 px-3 text-center">
        <Icon className="h-3 w-3 shrink-0 text-crystal-300" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-mist-200/90 truncate">
          {stage}
        </span>
      </div>
    </div>
  );
}
