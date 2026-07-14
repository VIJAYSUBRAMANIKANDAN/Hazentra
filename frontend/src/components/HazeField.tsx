import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function HazeField() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const c = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // GSAP animates transforms directly, bypassing the CSS
    // prefers-reduced-motion rule in globals.css, so it needs its own guard.
    if (reducedMotion) return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
    tl.to(a.current, { x: 70, y: -40, duration: 10 }, 0)
      .to(b.current, { x: -60, y: 50, duration: 13 }, 0)
      .to(c.current, { x: 40, y: 30, duration: 11 }, 0);
    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div
        ref={a}
        className="absolute w-[700px] h-[700px] rounded-full bg-crystal-500/[0.05] blur-3xl"
        style={{ top: "-10%", left: "10%" }}
      />
      <div
        ref={b}
        className="absolute w-[600px] h-[600px] rounded-full bg-mist-400/[0.04] blur-3xl"
        style={{ top: "30%", right: "5%" }}
      />
      <div
        ref={c}
        className="absolute w-[500px] h-[500px] rounded-full bg-crystal-400/[0.04] blur-3xl"
        style={{ bottom: "-5%", left: "35%" }}
      />
    </div>
  );
}
