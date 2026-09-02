"use client";

import { useState } from "react";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { UssdFallback } from "@/components/UssdFallback";
import { api, hazardNeighbor, idempotencyKey, type HazardKind } from "@/lib/api";
import { useLandmarks } from "@/lib/useLandmarks";

const KINDS: { id: HazardKind; label: string }[] = [
  { id: "blocked_drainage", label: "Blocked drainage" },
  { id: "rising_water", label: "Rising flood water" },
  { id: "damaged_structure", label: "Damaged structure" },
];

export default function ReportPage() {
  const { landmarks, landmarkId, select } = useLandmarks();
  const [kind, setKind] = useState<HazardKind>("blocked_drainage");
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setStatus("");
    setOk(false);
    try {
      await api("/api/v1/hazards", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({
          kind,
          from_landmark: landmarkId,
          to_landmark: hazardNeighbor(landmarkId, landmarks),
          source: "pwa",
        }),
      });
      setOk(true);
      setStatus("Report received. Routes will treat that stretch as unsafe.");
    } catch {
      setStatus("Could not send. Dial *384*55# option 3.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="steps">3 of 4 · same as USSD option 3</p>
      <h1>Report a hazard</h1>
      <p className="lede">This reweights the alley graph for everyone — PWA and USSD.</p>
      <label className="label" htmlFor="kind">
        What is happening
      </label>
      <select id="kind" value={kind} onChange={(event) => setKind(event.target.value as HazardKind)}>
        {KINDS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <div className="row">
        <button className="btn teal" type="button" disabled={busy} onClick={submit}>
          {busy ? "Sending…" : "Send report"}
        </button>
      </div>
      {status ? <p className={ok ? "msg" : "err"}>{status}</p> : null}
      <UssdFallback extra="Option 3 is Report hazard." />
    </>
  );
}
