import { api } from "@/lib/api";

export default async function AlertsPage() {
  let headline = "Alerts unavailable";
  let detail = "Start the FastAPI engine or dial *384*55# option 4.";
  try {
    const data = await api<{ headline: string; detail: string }>("/api/v1/alerts");
    headline = data.headline;
    detail = data.detail;
  } catch {
    /* keep fallback */
  }

  return (
    <>
      <h1>Local alert</h1>
      <p className="msg">
        <strong>{headline}</strong>
        <br />
        <br />
        {detail}
      </p>
    </>
  );
}
