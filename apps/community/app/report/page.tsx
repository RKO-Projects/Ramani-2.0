"use client";

import { useState } from "react";
import Link from "next/link";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { UssdFallback } from "@/components/UssdFallback";
import { api, hazardNeighbor, idempotencyKey, type PublicHazard, type HazardKind } from "@/lib/api";
import { compressPhoto, recordVoiceNote } from "@/lib/media";
import { useLandmarks } from "@/lib/useLandmarks";
import { storageKeys, writeJson } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

const KIND_KEYS: { id: HazardKind; label: MessageKey; detail: MessageKey }[] = [
  { id: "blocked_drainage", label: "report.drain", detail: "report.drainHint" },
  { id: "rising_water", label: "report.rise", detail: "report.riseHint" },
  { id: "damaged_structure", label: "report.struct", detail: "report.structHint" },
];

export default function ReportPage() {
  const { t } = useI18n();
  const { landmarks, landmarkId, select } = useLandmarks();
  const [kind, setKind] = useState<HazardKind>("blocked_drainage");
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [stopper, setStopper] = useState<(() => void) | null>(null);
  const [report, setReport] = useState<PublicHazard | null>(null);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await compressPhoto(file));
    } catch (error) {
      setOk(false);
      setStatus(error instanceof Error ? error.message : t("report.fail"));
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
      setStatus(t("report.mic"));
    }
  }

  async function submit() {
    setBusy(true);
    setStatus("");
    setOk(false);
    try {
      const created = await api<{ id: string }>("/api/v1/hazards", {
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
      const detail: PublicHazard = {
        id: created.id,
        kind,
        from_landmark: landmarkId,
        to_landmark: hazardNeighbor(landmarkId, landmarks),
        created_at: new Date().toISOString(),
        next_steps: [t("hazard.step1"), t("hazard.step2"), t("hazard.step3"), t("hazard.step4")],
      };
      try {
        const remote = await api<PublicHazard>(`/api/v1/hazards/${created.id}`);
        detail.id = remote.id;
      } catch {
        /* local confirmation is enough */
      }
      writeJson(storageKeys.hazard, detail);
      setReport(detail);
      setOk(true);
      setStatus(t("report.ok", { id: created.id.slice(0, 8) }));
      setPhoto(null);
      setVoice(null);
    } catch {
      setStatus(t("report.fail"));
    } finally {
      setBusy(false);
    }
  }

  const voiceLabel = recording ? t("report.voiceStop") : voice ? t("report.voiceOn") : t("report.voice");

  return (
    <PageFrame>
      <div className="section-head">
        <h2>{t("report.title")}</h2>
      </div>
      <p className="lede">{t("report.lede")}</p>
      <ProcessSteps steps={[t("report.step1"), t("report.step2"), t("report.step3"), t("report.step4")]} current={report ? 3 : 0} />
      <div className="actions stack">
        {KIND_KEYS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={kind === item.id ? "action-card selected" : "action-card"}
            disabled={busy}
            onClick={() => setKind(item.id)}
          >
            <span className="action-icon" />
            <span>
              <b>{t(item.label)}</b>
              <small>{t(item.detail)}</small>
            </span>
          </button>
        ))}
      </div>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <label className="field">
        <span className="label">{t("report.photo")}</span>
        <input type="file" accept="image/*" capture="environment" onChange={(event) => onPhoto(event.target.files?.[0])} />
        {photo ? <span className="hint">{t("report.photoReady", { kb: Math.round((photo.length * 0.75) / 1024) })}</span> : null}
      </label>
      <button className="choice" type="button" disabled={busy} onClick={toggleVoice}>
        <b>{voiceLabel}</b>
        <small>{t("report.voiceHint")}</small>
      </button>
      <button className="primary" type="button" disabled={busy} onClick={submit}>
        {busy ? t("report.sending") : t("report.send")}
      </button>
      {status ? <p className={ok ? "msg" : "err"}>{status}</p> : null}
      {report ? (
        <div className="msg">
          <strong>{t("report.hazardTitle", { id: report.id.slice(0, 8) })}</strong>
          <ProcessSteps steps={[t("hazard.step1"), t("hazard.step2"), t("hazard.step3"), t("hazard.step4")]} current={0} />
          <div className="follow">
            <Link className="speak" href="/route">
              {t("report.newRoute")}
            </Link>
            <Link className="speak" href="/whatsapp?action=hazard">
              {t("report.waNeighbours")}
            </Link>
            <Link className="speak" href="/">
              {t("report.seeAlarm")}
            </Link>
          </div>
        </div>
      ) : null}
      <UssdFallback extra={t("report.ussd")} />
    </PageFrame>
  );
}
