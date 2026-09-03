"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AlertStatus, Paginated, SosEvent } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_PLANNER_API_KEY ?? "";
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:3001";

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
    href: "/map",
    label: "Map",
    section: "operations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
        <line x1="8" y1="3" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="21" />
      </svg>
    ),
  },
  {
    href: "/intel",
    label: "Intel",
    section: "operations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19V5h16v14" />
        <path d="M8 17V9M12 17v-5M16 17v-8" />
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
  return (
    <Suspense fallback={<div className="shell"><main className="main">{children}</main></div>}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [alert, setAlert] = useState<AlertStatus | null>(null);
  const [settlement, setSettlement] = useState("Kibera");
  const [openSosCount, setOpenSosCount] = useState<number>(0);
  const [query, setQuery] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/alerts`, { cache: "no-store" });
        if (res.ok && mounted) setAlert(await res.json());
      } catch { /* silent */ }
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_KEY) headers["X-API-Key"] = API_KEY;
    fetch(`${API_URL}/api/v1/admin/settlements`, { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { name: string; active: boolean }[]) => {
        const active = list.find((s) => s.active);
        if (active) setSettlement(active.name);
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!notesOpen) return;
    const close = () => setNotesOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [notesOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const applyQuery = (value: string) => {
    setQuery(value);
    const next = value.trim();
    if (pathname === "/") {
      router.replace(next ? `/?q=${encodeURIComponent(next)}` : "/", { scroll: false });
    }
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = query.trim();
    router.push(next ? `/?q=${encodeURIComponent(next)}` : "/");
  };

  const notice = alert
    ? (alert.headline || `${alert.outlook} · ${alert.tercile.replaceAll("_", " ")}`)
    : healthy === false
      ? "Backend offline — start FastAPI on :8000"
      : "Seasonal outlook is loading.";

  return (
    <div className="shell">
      <aside className="nav">
        <div className="nav-brand">
          <span className="nav-logo" aria-hidden>R</span>
          <div>
            <p className="nav-brand-name">Ramani</p>
            <p className="nav-brand-tag">Ops Center · DMU</p>
          </div>
        </div>

        <div className="nav-section">Menu</div>
        {NAV_ITEMS.filter((n) => n.section === "operations").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.href === "/" && openSosCount > 0 && (
              <span className="nav-badge">{openSosCount > 12 ? "12+" : openSosCount}</span>
            )}
          </Link>
        ))}

        <div className="nav-section">General</div>
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

        <div className="nav-promo">
          <p>Field app</p>
          <strong>Community PWA for SOS &amp; reports</strong>
          <a className="btn" href={COMMUNITY_URL} target="_blank" rel="noreferrer">
            Open PWA
          </a>
        </div>
      </aside>

      <header className="header">
        <span className="settlement-chip">{settlement}</span>
        <div className="header-search">
          <form className="search-bar" onSubmit={submitSearch}>
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => applyQuery(e.target.value)}
              placeholder="Search SOS, places, phones…"
              aria-label="Search ops"
            />
            <kbd>⌘K</kbd>
          </form>
        </div>
        <div className="header-actions">
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Alerts"
              onClick={(e) => {
                e.stopPropagation();
                setNotesOpen((open) => !open);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {(alert?.el_nino_mode || openSosCount > 0) ? <span className="dot" /> : null}
            </button>
            {notesOpen ? (
              <div className="notes-pop" onClick={(e) => e.stopPropagation()}>
                <strong>{alert?.el_nino_mode ? "El Niño watch" : "Ops notice"}</strong>
                <p>{notice}</p>
              </div>
            ) : null}
          </div>
          <div
            className={`health-dot ${healthy === true ? "ok" : healthy === false ? "err" : ""}`}
            title={healthy === true ? "Backend healthy" : healthy === false ? "Backend unreachable" : "Checking…"}
          />
          <div className="header-user">
            <span className="header-avatar">DM</span>
            <div className="header-user-meta">
              <b>Nairobi DMU</b>
              <span>ops desk · {settlement}</span>
            </div>
          </div>
        </div>
      </header>

      {!API_KEY && (
        <div className="api-key-banner">
          NEXT_PUBLIC_PLANNER_API_KEY is not set — protected endpoints will fail.
          Add it to <code>apps/planner/.env.local</code>
        </div>
      )}

      <main className="main">{children}</main>
    </div>
  );
}
