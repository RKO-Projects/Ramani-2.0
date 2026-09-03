"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AlertStatus, Paginated, SosEvent } from "@/lib/api";
import LiveClock from "./LiveClock";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";

const NAV_ITEMS = [
  {
    href: "/",
    label: "During",
    section: "operations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    href: "/before",
    label: "Before",
    section: "operations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/after",
    label: "After",
    section: "operations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Admin",
    section: "admin",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [alert, setAlert] = useState<AlertStatus | null>(null);
  const [settlement, setSettlement] = useState("Kibera");
  const [openSosCount, setOpenSosCount] = useState<number>(0);

  // Health polling
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
        if (mounted) setHealthy(res.ok);
      } catch {
        if (mounted) setHealthy(false);
      }
    };
    check();
    const iv = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // Alert fetch
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/alerts`, { cache: "no-store" });
        if (res.ok && mounted) {
          setAlert(await res.json());
        }
      } catch { /* silent */ }
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // Settlement fetch
  useEffect(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_KEY) headers["X-API-Key"] = API_KEY;
    fetch(`${API_URL}/api/v1/admin/settlements`, { headers, cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .then((list: { name: string; active: boolean }[]) => {
        const active = list.find((s) => s.active);
        if (active) setSettlement(active.name);
      })
      .catch(() => {});
  }, []);

  // SOS badge count polling
  useEffect(() => {
    let mounted = true;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_KEY) headers["X-API-Key"] = API_KEY;

    const loadSosCount = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/sos?status=open&limit=100`, { headers, cache: "no-store" });
        if (res.ok && mounted) {
          const data: Paginated<SosEvent> = await res.json();
          setOpenSosCount(data.total ?? data.items?.length ?? 0);
        }
      } catch { /* silent */ }
    };

    loadSosCount();
    const iv = setInterval(loadSosCount, 8_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="nav">
        <div className="nav-brand">
          <p className="nav-brand-name">Ramani</p>
          <p className="nav-brand-tag">Ops Center // DMU</p>
        </div>

        <div className="nav-section">Operations</div>
        {NAV_ITEMS.filter((n) => n.section === "operations").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.href === "/" && openSosCount > 0 && (
              <span className="nav-badge">{openSosCount}</span>
            )}
          </Link>
        ))}

        <div className="nav-section" style={{ marginTop: 16 }}>System</div>
        {NAV_ITEMS.filter((n) => n.section === "admin").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Header */}
      <header className="header">
        <span className="header-brand">
          Ramani <span>Ops</span>
        </span>
        <span className="header-sep" />
        <span className="coord-label">{settlement.toUpperCase()} // 01°19'S 36°47'E</span>
        <span className="header-sep" />

        {/* Alert Banner */}
        {alert ? (
          <div className={`alert-banner${alert.el_nino_mode ? " el-nino" : ""}`}>
            <span className="alert-banner-icon" />
            <span className="alert-banner-text">
              {alert.headline || `${alert.outlook} · ${alert.tercile.replaceAll("_", " ")}`}
            </span>
          </div>
        ) : (
          <div className="alert-banner">
            <span className="alert-banner-text" style={{ color: "var(--paper-muted)" }}>
              {healthy === false ? "Backend offline — start FastAPI on :8000" : "Loading alerts…"}
            </span>
          </div>
        )}

        <span className="header-sep" />

        {/* Live Clock */}
        <LiveClock />

        {/* Health Dot */}
        <div
          className={`health-dot ${healthy === true ? "ok" : healthy === false ? "err" : ""}`}
          title={healthy === true ? "Backend healthy" : healthy === false ? "Backend unreachable" : "Checking…"}
          style={{ marginLeft: 8 }}
        />
      </header>

      {/* API Key Warning */}
      {!API_KEY && (
        <div className="api-key-banner">
          ⚠ NEXT_PUBLIC_PLANNER_API_KEY is not set — protected endpoints will fail.
          Add it to <code>apps/planner/.env.local</code>
        </div>
      )}

      {/* Main */}
      <main className="main">{children}</main>
    </div>
  );
}
