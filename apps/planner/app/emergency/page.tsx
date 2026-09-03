import { api, type Paginated, type SosEvent } from "@/lib/api";

function waitLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} mins ago`;
}

export default async function EmergencyPage() {
  let events: SosEvent[] = [];
  let totalCount = 0;
  try {
    const data = await api<Paginated<SosEvent>>("/api/v1/sos");
    events = data.items;
    totalCount = data.total;
  } catch {
    events = [];
  }

  const getEventIcon = (kind: string) => {
    switch (kind) {
      case "flood_trapped": return "🌊";
      case "collapse_fire": return "🔥";
      case "medical": return "🏥";
      case "stuck_debris": return "🪵";
      case "stuck_location": return "📍";
      case "car_flooding": return "🚗";
      default: return "🆘";
    }
  };

  return (
    <>
      <h1>Emergency Feed</h1>
      <p className="lede">
        SOS queue from USSD (*384*55#), WhatsApp, and the community PWA. Location is a landmark / cell hash — not a live GPS trail.
        WhatsApp alerts go to local responders when an SOS is logged.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "28px"
      }}>
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🆘</div>
          <div style={{ color: "#fca5a5", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>{totalCount}</div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Open SOS</div>
        </div>
        <div style={{ background: "rgba(14, 124, 102, 0.15)", border: "1px solid rgba(14, 124, 102, 0.3)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📍</div>
          <div style={{ color: "#5dd9c1", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {new Set(events.map((e) => e.location_hash || e.landmark_id)).size}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Cell / landmark hashes</div>
        </div>
        <div style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>⏱️</div>
          <div style={{ color: "#fde68a", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {events.length > 0 ? waitLabel(events[0].created_at) : "—"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Oldest open wait</div>
        </div>
      </div>

      <section className="card">
        <h2 style={{ margin: "0 0 20px 0", fontSize: "18px" }}>SOS Timeline</h2>
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
            <p style={{ margin: "0", fontSize: "15px", fontWeight: 600 }}>No open SOS</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "13px" }}>
              PWA, WhatsApp bot, or USSD option 1 (*384*55#).
            </p>
          </div>
        ) : (
          <div>
            {events.map((event, idx) => (
              <div className="zone" key={event.id} id={event.id} style={{ paddingTop: idx === 0 ? "0" : "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "20px" }}>{getEventIcon(event.kind)}</span>
                    <strong>{event.kind.replaceAll("_", " ").toUpperCase()}</strong>
                    {event.needs_medical ? <span className="pill critical">MEDICAL</span> : null}
                  </div>
                  <div className="empty" style={{ margin: "0" }}>
                    📍 {event.landmark_id ?? "hashed cell"} · {event.location_hash ?? "—"}
                    {" · "}
                    <span style={{ color: "#9ee4c8", fontWeight: 500 }}>{event.source}</span>
                    {event.phone_masked ? ` · ${event.phone_masked}` : ""}
                    {` · wait ${waitLabel(event.created_at)}`}
                  </div>
                  <a href={`#${event.id}`} style={{ fontSize: "12px", color: "#5dd9c1" }}>
                    Ticket {event.id.slice(0, 8)}
                  </a>
                </div>
                <span className="pill critical">{new Date(event.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: "28px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>Three resident channels</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ color: "#5dd9c1", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>PWA</div>
            <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.6" }}>
              localhost:3001 · SVG schematic · hashed phone · optional photo/voice
            </p>
          </div>
          <div>
            <div style={{ color: "#fde68a", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>USSD</div>
            <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.6" }}>
              *384*55# · feature phones · GSM
            </p>
          </div>
          <div>
            <div style={{ color: "#fca5a5", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>WhatsApp</div>
            <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.6" }}>
              Text SOS / drop a pin · auto-alert to local responders
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
