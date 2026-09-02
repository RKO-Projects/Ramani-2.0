import { api, type DamageReport, type Paginated } from "@/lib/api";

export default async function DamagePage() {
  let reports: DamageReport[] = [];
  try {
    const data = await api<Paginated<DamageReport>>("/api/v1/damage");
    reports = data.items;
  } catch {
    reports = [];
  }

  return (
    <>
      <h1>Loss and damage</h1>
      <p className="lede">Community reports in the first 72 hours. Satellite change detection is a later layer, not the first picture of loss.</p>
      <section className="card">
        {reports.length === 0 ? (
          <p className="empty">No damage pins yet. A USSD hazard report will appear here.</p>
        ) : (
          reports.map((report) => (
            <div className="zone" key={report.id}>
              <div>
                <strong>{report.kind.replaceAll("_", " ")}</strong>
                <div className="empty">{report.landmark_id}</div>
              </div>
              <span className="pill">{report.verified ? "verified" : "unverified"}</span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
