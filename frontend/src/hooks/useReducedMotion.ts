import { useEffect, useState } from "react";

/** Tracks the `prefers-reduced-motion` media query live, so components can
 * skip/shorten ambient or decorative animation for users who've asked the
 * OS for less motion — without needing a page reload to pick up a change. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
