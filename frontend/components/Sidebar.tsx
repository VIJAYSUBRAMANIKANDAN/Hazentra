"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, UploadCloud, BarChart2, Info, Settings } from "lucide-react";

const ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Upload", href: "/upload", icon: UploadCloud },
  { label: "Results", href: "/results", icon: BarChart2 },
  { label: "About", href: "/about", icon: Info },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-1 py-6 pr-4 border-r border-stroke">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium focus-ring group"
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-lg bg-accentSoft border border-accent/30"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <Icon
              className={`w-4 h-4 relative z-10 ${active ? "text-accent" : "text-inkMuted group-hover:text-ink"}`}
            />
            <span className={`relative z-10 ${active ? "text-accent" : "text-inkMuted group-hover:text-ink"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
