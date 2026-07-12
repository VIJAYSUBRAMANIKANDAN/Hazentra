import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const SESSION_KEY = "hazentra_intro_played";

export default function IntroLoader({ onDone }: { onDone: () => void }) {
  const [mounted, setMounted] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const fog1 = useRef<HTMLDivElement>(null);
  const fog2 = useRef<HTMLDivElement>(null);
  const fog3 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alreadyPlayed = sessionStorage.getItem(SESSION_KEY);
    if (alreadyPlayed) {
      setMounted(false);
      onDone();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem(SESSION_KEY, "1");
        setMounted(false);
        onDone();
      },
    });

    gsap.set(logoRef.current, { opacity: 0, scale: 0.92, filter: "blur(28px)" });
    gsap.set([fog1.current, fog2.current, fog3.current], { opacity: 0 });

    tl.to([fog1.current, fog2.current, fog3.current], {
      opacity: 1,
      duration: 1.1,
      stagger: 0.15,
      ease: "power2.out",
    })
      .to(
        fog1.current,
        { x: 60, y: -30, duration: 3.2, ease: "sine.inOut" },
        "<"
      )
      .to(
        fog2.current,
        { x: -50, y: 20, duration: 3.6, ease: "sine.inOut" },
        "<"
      )
      .to(
        fog3.current,
        { x: 30, y: 40, duration: 3, ease: "sine.inOut" },
        "<"
      )
      .to(
        logoRef.current,
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out" },
        "-=2.2"
      )
      .to({}, { duration: 0.5 })
      .to([fog1.current, fog2.current, fog3.current], { opacity: 0, duration: 0.8 }, ">")
      .to(
        overlayRef.current,
        { opacity: 0, duration: 0.7, ease: "power2.inOut" },
        "-=0.3"
      );

    return () => {
      tl.kill();
    };
  }, [onDone]);

  if (!mounted) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-ink-950 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={fog1}
        className="absolute w-[600px] h-[600px] rounded-full bg-mist-400/[0.05] blur-3xl"
        style={{ top: "10%", left: "15%" }}
      />
      <div
        ref={fog2}
        className="absolute w-[700px] h-[700px] rounded-full bg-crystal-500/[0.06] blur-3xl"
        style={{ bottom: "5%", right: "10%" }}
      />
      <div
        ref={fog3}
        className="absolute w-[500px] h-[500px] rounded-full bg-mist-300/[0.04] blur-3xl"
        style={{ top: "40%", right: "25%" }}
      />
      <img
        ref={logoRef}
        src="/hazentra-logo.png"
        alt="Hazentra"
        className="relative w-[280px] sm:w-[380px] select-none pointer-events-none"
      />
    </div>
  );
}
