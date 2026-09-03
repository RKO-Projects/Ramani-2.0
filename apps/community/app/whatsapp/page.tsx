"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { TicketPanel } from "@/components/TicketPanel";
import { UssdFallback } from "@/components/UssdFallback";
import {
  api,
  type SosKind,
  type WhatsAppDispatch,
  type WhatsAppGuide,
  whatsappHref,
} from "@/lib/api";
import { readPhone } from "@/lib/location";
import { useLandmarks } from "@/lib/useLandmarks";
import { storageKeys, writeJson } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

type Action = "sos" | "hazard" | "route";

const ACTION_KEYS: Record<Action, { title: MessageKey; hint: MessageKey }> = {
  sos: { title: "tab.sos", hint: "wa.sosHint" },
  hazard: { title: "wa.hazardTitle", hint: "wa.hazardHint" },
  route: { title: "wa.routeTitle", hint: "wa.routeHint" },
};

const KIND_KEYS: { id: SosKind; label: MessageKey }[] = [
  { id: "flood_trapped", label: "sos.flood" },
  { id: "collapse_fire", label: "sos.fire" },
  { id: "medical", label: "sos.medical" },
  { id: "stuck_debris", label: "sos.debris" },
  { id: "stuck_location", label: "sos.stuck" },
  { id: "car_flooding", label: "sos.car" },
];

export default function WhatsAppPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="lede">{t("wa.loading")}</p>
        </PageFrame>
      }
    >
      <WhatsAppInner />
    </Suspense>
  );
}

function WhatsAppInner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const { landmarks, landmarkId, select } = useLandmarks();
  const [guide, setGuide] = useState<WhatsAppGuide | null>(null);
  const [action, setAction] = useState<Action>((params.get("action") as Action) || "sos");
  const [kind, setKind] = useState<SosKind>("flood_trapped");
  const [medical, setMedical] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WhatsAppDispatch | null>(null);
  const ticketPrefill = params.get("ticket");

  useEffect(() => {
    api<WhatsAppGuide>("/api/v1/whatsapp/guide")
      .then(setGuide)
      .catch(() => {
        setGuide({
          configured: false,
          number: null,
          steps: [t("wa.step1"), t("wa.step2"), t("wa.step3")],
          templates: {},
        });
      });
  }, [t]);

  useEffect(() => {
    const next = params.get("action");
    if (next === "sos" || next === "hazard" || next === "route") setAction(next);
  }, [params]);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const payload = await api<WhatsAppDispatch>("/api/v1/whatsapp/dispatch", {
        method: "POST",
        body: JSON.stringify({
          action,
          kind: action === "hazard" ? "blocked_drainage" : kind,
          landmark_id: landmarkId,
          phone: readPhone() || null,
          needs_medical: medical,
          ticket_id: action === "sos" ? ticketPrefill : undefined,
        }),
      });
      setResult(payload);
      if (payload.id && payload.type === "sos") writeJson(storageKeys.ticket, { id: payload.id, kind, status: payload.status ?? "open", source: "whatsapp" });
      if (payload.wa_url) window.open(payload.wa_url, "_blank");
    } catch {
      setError(t("wa.fail"));
    } finally {
      setBusy(false);
    }
  }

  const fallbackText =
    action === "hazard"
      ? `HAZARD blocked_drainage at ${landmarkId}. Treat the path as unsafe.`
      : action === "route"
        ? `Need evacuation route from ${landmarkId} to high ground.`
        : `SOS ${kind} at ${landmarkId}. Medical: ${medical ? "yes" : "no"}.`;
  const href = result?.wa_url || whatsappHref(result?.message || fallbackText, result?.number || guide?.number || undefined);
  const guideSteps = [t("wa.step1"), t("wa.step2"), t("wa.step3")];

  return (
    <PageFrame>
      <div className="section-head">
        <h2>{t("wa.title")}</h2>
      </div>
      <p className="lede">{t("wa.lede")}</p>
      <ProcessSteps steps={guideSteps} current={result ? 2 : 0} />
      <div className="actions stack">
        {(Object.keys(ACTION_KEYS) as Action[]).map((item) => (
          <button
            key={item}
            type="button"
            className={action === item ? "action-card selected" : "action-card"}
            onClick={() => {
              setAction(item);
              setResult(null);
            }}
          >
            <span>
              <b>{t(ACTION_KEYS[item].title)}</b>
              <small>{t(ACTION_KEYS[item].hint)}</small>
            </span>
          </button>
        ))}
      </div>
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      {action === "sos" ? (
        <>
          <label className="field">
            <span className="label">{t("wa.kind")}</span>
            <span className="field-box">
              <select value={kind} onChange={(event) => setKind(event.target.value as SosKind)}>
                {KIND_KEYS.map((row) => (
                  <option key={row.id} value={row.id}>
                    {t(row.label)}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="triage">
            <input type="checkbox" checked={medical} onChange={(event) => setMedical(event.target.checked)} />
            <span>{t("home.medical")}</span>
          </label>
        </>
      ) : null}
      <button className="primary" type="button" disabled={busy} onClick={() => void run()}>
        {busy ? t("wa.logging") : t("wa.log")}
      </button>
      {result ? (
        <div className="msg">
          <strong>{t("wa.ready", { type: result.type.toUpperCase() })}</strong>
          <p>{result.message}</p>
          <ProcessSteps steps={guideSteps} current={1} />
          <div className="follow">
            {href ? (
              <a className="speak" href={href} target="_blank" rel="noreferrer">
                {t("wa.open")}
              </a>
            ) : (
              <button className="speak" type="button" onClick={() => navigator.clipboard.writeText(result.message)}>
                {t("wa.copy")}
              </button>
            )}
          </div>
        </div>
      ) : null}
      {result?.id && result.type === "sos" ? <TicketPanel ticketId={result.id} /> : null}
      {error ? <p className="err">{error}</p> : null}
      <p className="hint">{t("wa.inbound")}</p>
      <UssdFallback extra={t("wa.ussd")} />
    </PageFrame>
  );
}
