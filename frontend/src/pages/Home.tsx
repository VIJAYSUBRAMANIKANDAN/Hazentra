import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ScanEye, Layers, Wand2, } from "lucide-react";


gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: ScanEye,
    title: "ViT-based haze estimation",
    desc: "A Vision Transformer reads every patch of the scene and predicts local scattering density directly from pixels.",
  },
  {
    icon: Layers,
    title: "NAS codebook retrieval",
    desc: "Learned prototypes, discovered via architecture search, anchor predictions so they generalize beyond the training set.",
  },
  {
    icon: Wand2,
    title: "Physics-guided reconstruction",
    desc: "Dark-channel atmospheric light and the transmission map recombine to recover the clean, true-color scene.",
  },
];

export default function Home() {
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = featuresRef.current?.querySelectorAll("[data-feature-card]");
    if (!cards) return;
    gsap.fromTo(
      cards,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 80%",
        },
      }
    );
    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <div className="mx-auto max-w-[1680px] px-4 sm:px-6 py-14 sm:py-20">
      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            See through the haze,
            <br />
            <span className="text-crystal-400">instantly.</span>
          </h1>
          <p className="mt-5 text-base text-mist-400 max-w-md leading-relaxed">
            Hazentra restores clarity to smog, fog, and haze-degraded photos using a
            Vision-Transformer-driven deep learning pipeline — upload a photo, get a
            clean scene back in seconds.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link
              to="/upload"
              className="focus-ring group inline-flex items-center gap-2 rounded-lg bg-crystal-500 text-ink-950 text-sm font-semibold px-5 py-3 hover:bg-crystal-400 transition-colors"
            >
              Start Dehazing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/about"
              className="focus-ring rounded-lg border border-ink-600 text-sm font-semibold px-5 py-3 text-mist-300 hover:bg-ink-800 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-ink-700 bg-ink-900 shadow-card overflow-hidden aspect-[4/3]"
        >
          <div className="absolute inset-0 grid grid-cols-2">
            <div className="relative flex items-center justify-center bg-gradient-to-br from-ink-600 to-ink-800">
              <CitySVG hazy />
              <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-wider text-mist-300/80 bg-black/30 px-2 py-1 rounded">
                HAZY
              </span>
            </div>
            <div className="relative flex items-center justify-center bg-gradient-to-br from-crystal-600/40 to-ink-900">
              <CitySVG hazy={false} />
              <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-wider text-crystal-300 bg-black/30 px-2 py-1 rounded">
                CLEAR
              </span>
            </div>
          </div>
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/40" />
        </motion.div>
      </div>

      {/* Feature cards */}
      <div ref={featuresRef} className="mt-24 grid sm:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            data-feature-card
            className="rounded-2xl border border-ink-700 bg-ink-900/60 p-6 hover:border-crystal-500/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-crystal-500/10 flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-crystal-400" />
            </div>
            <div className="text-sm font-semibold text-white">{f.title}</div>
            <p className="mt-2 text-xs text-mist-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CitySVG({ hazy }: { hazy: boolean }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full">
      {[...Array(7)].map((_, i) => {
        const w = 14 + ((i * 23) % 18);
        const h = 40 + ((i * 31) % 70);
        const x = i * 26 + 8;
        return (
          <rect
            key={i}
            x={x}
            y={140 - h}
            width={w}
            height={h}
            fill={hazy ? "#7C8CA0" : "#5EEAD4"}
            opacity={hazy ? 0.28 - i * 0.01 : 0.8 - i * 0.05}
          />
        );
      })}
    </svg>
  );
}
