import { useEffect } from "react";
import Lenis from "lenis";

export function useLenis() {
  useEffect(() => {
    // Lenis re-implements scrolling in JS to get its custom easing on
    // desktop mouse-wheel input. On touch devices this fights the browser's
    // own (already smooth, GPU-accelerated) momentum scrolling — it's a
    // well-documented source of janky/laggy scroll and unresponsive taps on
    // phones. Detect touch/coarse-pointer devices and skip Lenis entirely
    // there; native scrolling is the better and smoother choice on mobile.
    const isTouchDevice =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

    if (isTouchDevice) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
}
