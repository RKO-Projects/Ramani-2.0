"use client";

import { useState } from "react";
import { api, type SosEvent } from "@/lib/api";

export function SosTicketActions({ event }: { event: SosEvent }) {
  const [status, setStatus] = useState(event.status ?? "open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setNext(next: "acknowledged" | "resolved") {
    setBusy(true);
    setError("");
    try {
      const updated = await api<SosEvent>(`/api/v1/sos/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setStatus(updated.status ?? next);
    } catch {
      setError("Could not update ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "8px", justifyItems: "end" }}>
      <span className={`pill ${status === "resolved" ? "verified" : "critical"}`}>{status}</span>
      {status !== "resolved" ? (
        <div style={{ display: "flex", gap: "8px" }}>
          {status === "open" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void setNext("acknowledged")}
              style={{
                border: 0,
                borderRadius: 8,
                padding: "6px 10px",
                background: "#0e7c66",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Acknowledge
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void setNext("resolved")}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "6px 10px",
              background: "#1b4b7a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Resolve
          </button>
        </div>
      ) : null}
      {error ? <small>{error}</small> : null}
    </div>
  );
}
