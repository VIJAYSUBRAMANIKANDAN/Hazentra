import { useEffect, useState } from "react";

/** Tracks browser connectivity so the Upload flow can warn a user before
 * they hit the SSE stall timeout in lib/api.ts, rather than after. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
