import { api, type CviZone } from "@/lib/api";

export default async function DashboardPage() {
  let zones: CviZone[] = [];
  let outlook = "Engine offline — start the FastAPI backend on :8000";
  try {
    const data = await api<{ outlook: string; tercile: string; zones: CviZone[] }>("/api/v1/cvi");
    zones = data.zones;
    outlook = `${data.outlook} · ${data.tercile.replaceAll("_", " ")}`;
  } catch {
    /* skeleton still renders */
  }

  return (
    <>
      <h1>Climate Vulnerability Index</h1>
      <p className="lede">{outlook}. Highest CVI first — these are the drainage stretches to clear before the rains.</p>
      <div className="grid">
        <section className="card">
          <div className="map-fake" aria-hidden>
            <span className="pin" style={{ top: "42%", left: "34%" }} />
            <span className="pin" style={{ top: "58%", left: "48%" }} />
            <span className="pin" style={{ top: "36%", left: "62%" }} />
          </div>
          <p className="empty">Mapbox tiles wire in next. Seed pins mark Line Saba, Silanga, Laini Saba.</p>
        </section>
        <section className="card">
          {zones.length === 0 ? (
            <p className="empty">No CVI yet. Run the backend to score Kibera zones.</p>
          ) : (
            zones.map((zone) => (
              <div className="zone" key={zone.id}>
                <div>
                  <strong>{zone.name}</strong>
                  <div className="bar">
                    <span style={{ width: `${Math.round(zone.cvi * 100)}%` }} />
                  </div>
                </div>
                <span className={`pill ${zone.priority}`}>
                  {zone.priority} · {zone.cvi.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
