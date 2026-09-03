"use client";

import { useEffect } from "react";

export function RegisterSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      return;
    }

    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` || "/" }).catch(() => {
      /* ignore */
    });
  }, []);
  return null;
}
