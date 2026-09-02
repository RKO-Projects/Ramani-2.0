import { api, type Paginated, type SosEvent } from "@/lib/api";

export default async function EmergencyPage() {
  let events: SosEvent[] = [];
  try {
    const data = await api<Paginated<SosEvent>>("/api/v1/sos");
    events = data.items;
  } catch {
    events = [];
  }

  return (
    <>
      <h1>Emergency feed</h1>
      <p className="lede">SOS from the PWA and *384*55#. Landmark first, then Cell-ID if that is all we have.</p>
      <section className="card">
        {events.length === 0 ? (
          <p className="empty">No open SOS. Trigger one from the community app or USSD option 1.</p>
        ) : (
          events.map((event) => (
            <div className="zone" key={event.id}>
              <div>
                <strong>{event.kind.replaceAll("_", " ")}</strong>
                <div className="empty">{event.landmark_id ?? "unknown landmark"} · {event.source}</div>
              </div>
              <span className="pill critical">{new Date(event.created_at).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
