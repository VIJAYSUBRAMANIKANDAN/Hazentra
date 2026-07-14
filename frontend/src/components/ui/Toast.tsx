import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { ToastContext, type ToastKind } from "./toastContext";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const KIND_ICON: Record<ToastKind, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const KIND_CLASSES: Record<ToastKind, string> = {
  success: "border-crystal-500/30 text-crystal-300",
  warning: "border-amber-500/30 text-amber-300",
  error: "border-red-500/30 text-red-300",
  info: "border-mist-400/30 text-mist-200",
};

const AUTO_DISMISS_MS = 4000;

/**
 * Wraps the app once (see App.tsx). Any component can call
 * `useToast().showToast(...)` instead of failing silently — this is what
 * backs the "Image dehazed successfully" / "Download started" / "Network
 * disconnected" notifications requested in the UI review.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 w-[calc(100vw-2.5rem)] max-w-sm"
          role="region"
          aria-label="Notifications"
        >
          <AnimatePresence>
            {toasts.map((toast) => {
              const Icon = KIND_ICON[toast.kind];
              return (
                <motion.div
                  key={toast.id}
                  role="status"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  className={`flex items-start gap-2.5 rounded-lg border bg-ink-900/95 backdrop-blur px-3.5 py-3 shadow-card ${KIND_CLASSES[toast.kind]}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-sm text-mist-100 flex-1">{toast.message}</span>
                  <button
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                    className="focus-ring rounded p-0.5 text-mist-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
