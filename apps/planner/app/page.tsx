import { api, type CviZone } from "@/lib/api";

export default async function DashboardPage() {
  let zones: CviZone[] = [];
  let outlook = "🔴 Engine offline — start the FastAPI backend on :8000";
  let tercile = "";
  try {
    const data = await api<{ outlook: string; tercile: string; zones: CviZone[] }>("/api/v1/cvi");
    zones = data.zones;
    outlook = `${data.outlook}`;
    tercile = data.tercile.replaceAll("_", " ");
  } catch {
    /* skeleton still renders */
  }

  return (
    <>
      <h1>📊 Climate Vulnerability Index</h1>
      <p className="lede">
        Real-time analysis of drainage vulnerability across Kibera neighborhoods. 
        Highest CVI first — these are the priority drainage stretches to clear before the rains.
      </p>
      
      <div style={{ 
        background: "rgba(14, 124, 102, 0.15)", 
        border: "1px solid rgba(14, 124, 102, 0.3)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "28px",
        color: "#5dd9c1",
        fontSize: "14px"
      }}>
        <strong>🌤️ Seasonal Outlook:</strong> {outlook}
        {tercile && <div style={{ marginTop: "8px", color: "var(--muted)" }}>Tercile: <strong>{tercile}</strong></div>}
      </div>

      <div className="grid">
        <section className="card">
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>🗺️ Kibera Zone Map</h2>
          <div className="map-fake" aria-hidden>
            <span className="pin" style={{ top: "42%", left: "34%", animationDelay: "0s" }} title="Line Saba" />
            <span className="pin" style={{ top: "58%", left: "48%", animationDelay: "0.3s" }} title="Silanga" />
            <span className="pin" style={{ top: "36%", left: "62%", animationDelay: "0.6s" }} title="Laini Saba" />
          </div>
          <p className="empty">📍 Mapbox tiles wire in next. Seed pins mark: Line Saba, Silanga, Laini Saba</p>
        </section>
        <section className="card">
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>⚠️ Vulnerability Ranking</h2>
          {zones.length === 0 ? (
            <p className="empty">📡 No CVI data yet. Run the backend to score Kibera zones. Check: http://localhost:8000/docs</p>
          ) : (
            <div>
              {zones.map((zone, idx) => (
                <div className="zone" key={zone.id}>
                  <div>
                    <strong>#{idx + 1} {zone.name}</strong>
                    <div className="bar">
                      <span style={{ 
                        width: `${Math.round(zone.cvi * 100)}%`,
                        backgroundColor: zone.cvi > 0.7 ? "#ef4444" : zone.cvi > 0.4 ? "#f59e0b" : "#10b981"
                      }} />
                    </div>
                    <div className="empty" style={{ marginTop: "4px" }}>
                      Priority: <strong>{zone.priority}</strong>
                    </div>
                  </div>
                  <span className={`pill ${zone.priority}`}>
                    {zone.cvi.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: "28px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>💡 What is CVI?</h2>
        <div style={{ columns: 2, gap: "20px", columnGap: "28px" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.7" }}>
            The <strong>Climate Vulnerability Index</strong> measures how exposed neighborhoods are to flooding and infrastructure collapse during rainy seasons. It combines:
          </p>
          <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "14px", color: "var(--muted)", lineHeight: "1.8" }}>
            <li>Drainage system quality</li>
            <li>Historical flood patterns</li>
            <li>Building structure stability</li>
            <li>Population density</li>
            <li>Emergency access routes</li>
          </ul>
          <p style={{ margin: "12px 0 0 0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.7" }}>
            <strong style={{ color: "#5dd9c1" }}>Red zones (0.7+)</strong> need immediate attention. Clearing drainage and reinforcing structures saves lives.
          </p>
        </div>
      </section>
    </>
  );
}
