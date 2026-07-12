import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, UploadCloud, BarChart3, Info, Settings } from "lucide-react";

const ITEMS = [
  { label: "Home", to: "/", icon: Home },
  { label: "Upload", to: "/upload", icon: UploadCloud },
  { label: "Results", to: "/results", icon: BarChart3 },
  { label: "About", to: "/about", icon: Info },
  { label: "Settings", to: "/settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-1 py-8 pr-5 border-r border-ink-700/60">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium focus-ring group"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="sidebar-pill"
                  className="absolute inset-0 rounded-lg bg-crystal-500/10 border border-crystal-500/25"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <item.icon
                className={`w-4 h-4 relative z-10 ${
                  isActive ? "text-crystal-400" : "text-mist-400 group-hover:text-mist-200"
                }`}
              />
              <span className={`relative z-10 ${isActive ? "text-crystal-400" : "text-mist-400 group-hover:text-mist-200"}`}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </aside>
  );
}
