import type { SosStatus } from "@/lib/api";

type BadgeVariant = SosStatus | "verified" | "unverified" | "pwa" | "ussd"
  | "low" | "moderate" | "high" | "critical";

export default function StatusBadge({ variant, label }: { variant: BadgeVariant; label?: string }) {
  const text = label ?? variant.replaceAll("_", " ");
  return <span className={`pill ${variant}`}>{text}</span>;
}
