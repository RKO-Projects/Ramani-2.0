"use client";

import { useState } from "react";
import { api, LANDMARKS } from "@/lib/api";

export default function SosPage() {
  const [landmark, setLandmark] = useState("line-saba");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(kind: string) {
    setBusy(true);
    setStatus("");
    try {
      await api("/api/v1/sos", {
        method: "POST",
        body: JSON.stringify({ kind, landmark_id: landmark, source: "pwa" }),
      });
      setStatus("SOS sent. Stay on higher ground. Help is logged for responders.");
    } catch {
      setStatus("Could not reach Ramani. Dial *384*55# if you have no data.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Emergency SOS</h1>
      <label className="label">Nearest landmark</label>
      <select value={landmark} onChange={(event) => setLandmark(event.target.value)}>
        {LANDMARKS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <div className="row">
        <button className="sos" disabled={busy} onClick={() => send("flood_trapped")}>
          SOS
        </button>
        <button className="secondary" disabled={busy} onClick={() => send("collapse_fire")}>
          Collapse / fire
        </button>
        <button className="secondary" disabled={busy} onClick={() => send("medical")}>
          Medical
        </button>
      </div>
      {status ? <p className={status.startsWith("Could") ? "err" : "msg"}>{status}</p> : null}
    </>
  );
}
