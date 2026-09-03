"use client";

import { useState } from "react";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { UssdFallback } from "@/components/UssdFallback";
import { api, hazardNeighbor, idempotencyKey, type HazardKind } from "@/lib/api";
import { compressPhoto, recordVoiceNote } from "@/lib/media";
import { useLandmarks } from "@/lib/useLandmarks";

const KINDS: { id: HazardKind; label: string; detail: string }[] = [
  { id: "blocked_drainage", label: "Blocked drainage", detail: "Water cannot flow" },
  { id: "rising_water", label: "Rising flood water", detail: "Water level going up" },
  { id: "damaged_structure", label: "Damaged structure", detail: "Building or path unsafe" },
];

export default function ReportPage() {
  const { landmarks, landmarkId, select } = useLandmarks();
  const [kind, setKind] = useState<HazardKind>("blocked_drainage");
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [stopper, setStopper] = useState<(() => void) | null>(null);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await compressPhoto(file));
    } catch (error) {
      setOk(false);
      setStatus(error instanceof Error ? error.message : "Could not compress photo.");
    }
  }

  async function toggleVoice() {
    if (recording && stopper) {
      stopper();
      setRecording(false);
      setStopper(null);
      return;
    }
    try {
      const session = await recordVoiceNote();
      setRecording(true);
      setStopper(() => session.stop);
      const data = await session.done;
      setVoice(data);
      setRecording(false);
      setStopper(null);
    } catch {
      setRecording(false);
      setStatus("Microphone permission is needed for a 15-second voice note.");
    }
  }

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
          photo_b64: photo,
          voice_b64: voice,
        }),
      });
      setOk(true);
      setStatus("Report received. Photo/voice stay optional so the bundle stays small.");
      setPhoto(null);
      setVoice(null);
    } catch {
      setStatus("Could not send. WhatsApp a pin or dial *384*55# option 3.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <div className="section-head">
        <h2>Report a hazard</h2>
      </div>
      <p className="lede">Text first. Photo under 50KB and a 15-second voice note are optional.</p>
      <div className="actions stack">
        {KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={kind === item.id ? "action-card selected" : "action-card"}
            disabled={busy}
            onClick={() => setKind(item.id)}
          >
            <span className="action-icon" />
            <span>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </span>
          </button>
        ))}
      </div>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <label className="field">
        <span className="label">Photo (optional, compressed on this phone)</span>
        <input type="file" accept="image/*" capture="environment" onChange={(event) => onPhoto(event.target.files?.[0])} />
        {photo ? <span className="hint">Photo ready · {Math.round((photo.length * 0.75) / 1024)} KB</span> : null}
      </label>
      <button className="choice" type="button" disabled={busy} onClick={toggleVoice}>
        <b>{recording ? "Stop voice note" : voice ? "Voice note attached" : "Record 15s voice note"}</b>
        <small>For people who cannot type under shock</small>
      </button>
      <button className="primary" type="button" disabled={busy} onClick={submit}>
        {busy ? "Sending…" : "Send report"}
      </button>
      {status ? <p className={ok ? "msg" : "err"}>{status}</p> : null}
      <UssdFallback extra="option 3 is Report hazard." />
    </PageFrame>
  );
}
