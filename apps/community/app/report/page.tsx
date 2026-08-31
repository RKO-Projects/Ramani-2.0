"use client";

import { useState } from "react";
import { api, LANDMARKS } from "@/lib/api";

const KINDS = [
  { id: "blocked_drainage", label: "Blocked drainage" },
  { id: "rising_water", label: "Rising flood water" },
  { id: "damaged_structure", label: "Damaged structure" },
];

export default function ReportPage() {
  const [kind, setKind] = useState("blocked_drainage");
  const [from, setFrom] = useState("line-saba");
  const [status, setStatus] = useState("");

  async function submit() {
    try {
      await api("/api/v1/hazards", {
        method: "POST",
        body: JSON.stringify({
          kind,
          from_landmark: from,
          to_landmark: "main-drain-alley",
          source: "pwa",
        }),
      });
      setStatus("Report received. The live map and routes will treat that alley as unsafe.");
    } catch {
      setStatus("Could not send. Try USSD option 3.");
    }
  }

  return (
    <>
      <h1>Report a hazard</h1>
      <label className="label">What is happening</label>
      <select value={kind} onChange={(event) => setKind(event.target.value)}>
        {KINDS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <label className="label">Near</label>
      <select value={from} onChange={(event) => setFrom(event.target.value)}>
        {LANDMARKS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <div className="row">
        <button className="btn teal" onClick={submit}>
          Send report
        </button>
      </div>
      {status ? <p className="msg">{status}</p> : null}
    </>
  );
}
