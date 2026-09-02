"use client";

import { USSD_CODE } from "@/lib/api";

export function UssdFallback({ extra }: { extra?: string }) {
  return (
    <p className="ussd">
      No data? Dial <strong>{USSD_CODE}</strong>
      {extra ? ` ${extra}` : " — same four options as this app."}
    </p>
  );
}
