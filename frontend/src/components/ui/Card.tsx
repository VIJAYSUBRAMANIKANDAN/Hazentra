import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-3.5",
  md: "p-5",
  lg: "p-7",
};

/**
 * Standard card surface — the `rounded-2xl border border-ink-700 bg-ink-900/60`
 * pattern was already repeated in Upload.tsx, Results.tsx, and Settings.tsx
 * with slightly different padding each time. Centralizing it here means a
 * future brand tweak (radius, border color) is a one-file change.
 */
export default function Card({ accent = false, padding = "md", className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border shadow-card ${
        accent ? "border-crystal-500/30" : "border-ink-700"
      } bg-ink-900/60 ${PADDING_CLASSES[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
