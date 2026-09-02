import { api, type DamageReport, type Paginated } from "@/lib/api";

export default async function DamagePage() {
  let reports: DamageReport[] = [];
  try {
    const data = await api<Paginated<DamageReport>>("/api/v1/damage");
    reports = data.items;
  } catch {
    reports = [];
  }

  const verifiedCount = reports.filter(r => r.verified).length;
  const unverifiedCount = reports.filter(r => !r.verified).length;

  const getDamageIcon = (kind: string) => {
    switch(kind) {
      case "blocked_drainage": return "🚰";
      case "rising_water": return "🌊";
      case "damaged_structure": return "🏚️";
      default: return "⚠️";
    }
  };

  return (
    <>
      <h1>💔 Loss and Damage</h1>
      <p className="lede">
        Community damage reports in the critical first 72 hours following an event. 
        These field observations take priority. Satellite change detection will be a later layer, not the first picture.
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
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📍</div>
          <div style={{ color: "#fca5a5", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {reports.length}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Total Reports</div>
        </div>

        <div style={{
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "12px",
          padding: "16px"
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>✅</div>
          <div style={{ color: "#a7f3d0", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {verifiedCount}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Verified</div>
        </div>

        <div style={{
          background: "rgba(245, 158, 11, 0.15)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "12px",
          padding: "16px"
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>⏳</div>
          <div style={{ color: "#fde68a", fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
            {unverifiedCount}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>Pending Verification</div>
        </div>
      </div>

      <section className="card">
        <h2 style={{ margin: "0 0 20px 0", fontSize: "18px" }}>📋 Damage Reports</h2>
        {reports.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--muted)"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📊</div>
            <p style={{ margin: "0", fontSize: "15px", fontWeight: 600 }}>No damage reports yet</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "13px" }}>
              A USSD hazard report from the community will appear here. Dial *384*55# option 3 to report damage.
            </p>
          </div>
        ) : (
          <div>
            {reports.map((report) => (
              <div className="zone" key={report.id}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "20px" }}>{getDamageIcon(report.kind)}</span>
                    <strong>{report.kind.replaceAll("_", " ").toUpperCase()}</strong>
                  </div>
                  <div className="empty" style={{ margin: "0" }}>
                    📍 {report.landmark_id}
                  </div>
                </div>
                <span className={`pill ${report.verified ? "verified" : "unverified"}`}>
                  {report.verified ? "✓ Verified" : "⏳ Unverified"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: "28px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>📢 Report Damage</h2>
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
              Visit http://localhost:3001 · Tap Report · Select damage type and affected zone
            </p>
          </div>
          <div>
            <div style={{ color: "#fde68a", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>
              ☎️ USSD Hotline
            </div>
            <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.6" }}>
              Dial <strong>*384*55#</strong> option 3 · Specify damage type and landmark · Critical for early response
            </p>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: "28px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>💡 Why First-Hand Reports Matter</h2>
        <ul style={{ 
          margin: "0", 
          paddingLeft: "20px", 
          fontSize: "14px", 
          color: "var(--muted)", 
          lineHeight: "1.8",
          listStyle: "none"
        }}>
          <li style={{ marginBottom: "8px" }}>
            <span style={{ marginRight: "8px" }}>🎯</span>
            <strong style={{ color: "var(--paper)" }}>Precision:</strong> Ground truth beats satellite imagery for immediate response
          </li>
          <li style={{ marginBottom: "8px" }}>
            <span style={{ marginRight: "8px" }}>⚡</span>
            <strong style={{ color: "var(--paper)" }}>Speed:</strong> Real-time reports enable rapid resource allocation
          </li>
          <li style={{ marginBottom: "8px" }}>
            <span style={{ marginRight: "8px" }}>👥</span>
            <strong style={{ color: "var(--paper)" }}>Trust:</strong> Community-verified damage records build accountability
          </li>
          <li>
            <span style={{ marginRight: "8px" }}>🛡️</span>
            <strong style={{ color: "var(--paper)" }}>Resilience:</strong> Documented losses inform future prevention efforts
          </li>
        </ul>
      </section>
    </>
  );
}
