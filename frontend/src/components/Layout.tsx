import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import HazeField from "./HazeField";
import { useLenis } from "../hooks/useLenis";

export default function Layout({ children }: { children: React.ReactNode }) {
  useLenis();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-mist-200 relative overflow-x-hidden">
      <HazeField />
      <Navbar />
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
