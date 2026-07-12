import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Upload", to: "/upload" },
  { label: "Results", to: "/results" },
  { label: "About", to: "/about" },
  { label: "Settings", to: "/settings" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-lg">
      <div className="mx-auto max-w-[1680px] px-5 sm:px-8 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 shrink-0 group">
          <img
            src="/hazentra-mark.png"
            alt="Hazentra"
            className="h-8 w-auto group-hover:brightness-125 transition-all"
          />
          <span className="font-display font-semibold tracking-tight text-[15px] sm:text-base text-mist-200">
            HAZENTRA
          </span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="relative px-3.5 py-2 text-sm font-medium focus-ring rounded-md"
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "text-crystal-400" : "text-mist-400 hover:text-mist-200 transition-colors"}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-md bg-crystal-500/10 border border-crystal-500/20"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden focus-ring p-2 text-mist-300"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-ink-700/60"
          >
            <div className="flex flex-col px-5 py-3 gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-md text-sm font-medium ${
                      isActive ? "text-crystal-400 bg-crystal-500/10" : "text-mist-400"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
