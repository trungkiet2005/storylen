"use client";

import { useEffect } from "react";

/** Registers the service worker exactly once after first paint.
 *
 *  Only runs in production builds + when the browser supports SW + when the
 *  page is served over HTTPS or localhost (SW is disabled on http: hosts).
 *  Mount once near the root of the app (in `layout.tsx`).
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Non-fatal — page works without offline support.
          console.warn("[sw] registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
