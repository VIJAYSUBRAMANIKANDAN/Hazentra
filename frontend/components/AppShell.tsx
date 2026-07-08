"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Upload", href: "/upload" },
  { label: "Results", href: "/results" },
  { label: "About", href: "/about" },
  { label: "Settings", href: "/settings" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="sticky top-0 z-30 border-b border-stroke bg-canvas/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-5 h-5 text-accent" strokeWidth={2.25} />
            <span className="font-semibold tracking-tight text-[15px] sm:text-base">
              Hazentra
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-3 py-2 text-sm font-medium focus-ring rounded-md"
                >
                  <span className={active ? "text-accent" : "text-inkMuted hover:text-ink transition-colors"}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-2 right-2 -bottom-[1px] h-[2px] bg-accent rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-panel border border-stroke flex items-center justify-center text-inkMuted">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2 -mt-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition-colors focus-ring ${
                  active
                    ? "border-accent/40 bg-accentSoft text-accent"
                    : "border-stroke text-inkMuted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="flex-1">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
