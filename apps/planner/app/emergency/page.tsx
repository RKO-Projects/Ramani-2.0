import { api, type Paginated, type SosEvent } from "@/lib/api";

export default async function EmergencyPage() {
  let events: SosEvent[] = [];
  let totalCount = 0;
  try {
<<<<<<< HEAD
    const data = await api<Paginated<SosEvent>>("/api/v1/sos");
    events = data.items;
=======
    events = await api<SosEvent[]>("/api/v1/sos");
    totalCount = events.length;
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
  } catch {
    events = [];
  }

  const getEventIcon = (kind: string) => {
    switch(kind) {
      case "flood_trapped": return "🌊";
      case "collapse_fire": return "🔥";
      case "medical": return "🏥";
      default: return "🆘";
    }
  };

  const getEventColor = (kind: string) => {
    switch(kind) {
      case "flood_trapped": return "--flood";
      case "collapse_fire": return "--error";
      case "medical": return "--warning";
      default: return "--muted";
    }
  };

  return (
    <>
      <h1>🚨 Emergency Feed</h1>
      <p className="lede">
        Real-time SOS reports from the community PWA and *384*55# USSD hotline. 
        Location identified by landmark first, then Cell-ID if that's all available. 
        Latest reports appear first.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "28px"
      }}>
        <div style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "12px",
          padding: "16px"
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🆘</div>
          <div style={{ color: "#fca5a5", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {totalCount}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Open SOS Calls</div>
        </div>

        <div style={{
          background: "rgba(14, 124, 102, 0.15)",
          border: "1px solid rgba(14, 124, 102, 0.3)",
          borderRadius: "12px",
          padding: "16px"
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📍</div>
          <div style={{ color: "#5dd9c1", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {new Set(events.map(e => e.landmark_id)).size}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Affected Zones</div>
        </div>

        <div style={{
          background: "rgba(245, 158, 11, 0.15)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "12px",
          padding: "16px"
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>⏱️</div>
          <div style={{ color: "#fde68a", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {events.length > 0 
              ? new Date(events[0].created_at).toLocaleString() 
              : "—"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Latest Report</div>
        </div>
      </div>

      <section className="card">
        <h2 style={{ margin: "0 0 20px 0", fontSize: "18px" }}>📋 SOS Timeline</h2>
        {events.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--muted)"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
            <p style={{ margin: "0", fontSize: "15px", fontWeight: 600 }}>No open SOS</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "13px" }}>
              Trigger reports from the community app (http://localhost:3001) or USSD option 1 (*384*55#).
            </p>
          </div>
        ) : (
          <div>
            {events.map((event, idx) => (
              <div className="zone" key={event.id} style={{ paddingTop: idx === 0 ? "0" : "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "20px" }}>{getEventIcon(event.kind)}</span>
                    <strong>{event.kind.replaceAll("_", " ").toUpperCase()}</strong>
                  </div>
                  <div className="empty" style={{ margin: "0" }}>
                    📍 {event.landmark_id ?? "unknown landmark"} · 
                    <span style={{ color: "#9ee4c8", marginLeft: "4px", fontWeight: 500 }}>
                      {event.source}
                    </span>
                  </div>
                </div>
                <span className="pill critical">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: "28px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>📞 How to Report?</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px"
        }}>
          <div>
            <div style={{ color: "#5dd9c1", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>
              📱 Community App
            </div>
            <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.6" }}>
              Visit http://localhost:3001 · Tap the 🆘 SOS button · Select your emergency type and nearest landmark
            </p>
          </div>
          <div>
            <div style={{ color: "#fde68a", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>
              ☎️ USSD Hotline
            </div>
            <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.6" }}>
              Dial <strong>*384*55#</strong> option 1 · Report emergency type and location · Available 24/7
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
