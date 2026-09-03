"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readPhone } from "@/lib/location";

export function LocationGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (path.startsWith("/onboard")) return;
    if (!readPhone()) router.replace("/onboard");
  }, [path, router]);

  return <>{children}</>;
}
