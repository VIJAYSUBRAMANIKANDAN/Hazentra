import { useReducedMotion } from "../../hooks/useReducedMotion";

interface SkeletonProps {
  className?: string;
}

/**
 * Animated placeholder shown while an image (or any async content) hasn't
 * arrived yet, instead of a blank area. The pulse animation is skipped
 * entirely for prefers-reduced-motion — a static gray block still
 * communicates "loading" without the motion.
 */
export default function Skeleton({ className = "" }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`bg-ink-800 ${reducedMotion ? "" : "animate-pulse"} ${className}`}
    />
  );
}
