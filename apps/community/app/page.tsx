"use client";

import { useEffect, useState } from "react";
import { AlertStrip } from "@/components/AlertStrip";
import { ActionCard, UssdFallback } from "@/components/UssdFallback";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { LocationOptIn } from "@/components/LocationOptIn";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { TicketPanel } from "@/components/TicketPanel";
import { IconAlert, IconCar, IconCheck, IconDebris, IconFire, IconFlood, IconMedical, IconReport, IconRoute, IconStuck, IconWhatsApp } from "@/components/Icons";
import { api, ApiError, idempotencyKey, type RouteResult, type SosEvent, type SosKind } from "@/lib/api";
import { readPhone, rememberLandmark } from "@/lib/location";
import { speakRoute } from "@/lib/speak";
import { useLandmarks } from "@/lib/useLandmarks";
import { readJson, storageKeys, writeJson } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

const KIND_KEYS: { id: SosKind; label: MessageKey; hint: MessageKey; icon: typeof IconFlood }[] = [
  { id: "flood_trapped", label: "sos.flood", hint: "sos.floodHint", icon: IconFlood },
  { id: "collapse_fire", label: "sos.fire", hint: "sos.fireHint", icon: IconFire },
  { id: "medical", label: "sos.medical", hint: "sos.medicalHint", icon: IconMedical },
  { id: "stuck_debris", label: "sos.debris", hint: "sos.debrisHint", icon: IconDebris },
  { id: "stuck_location", label: "sos.stuck", hint: "sos.stuckHint", icon: IconStuck },
  { id: "car_flooding", label: "sos.car", hint: "sos.carHint", icon: IconCar },
];

export default function HomePage() {
  const { t } = useI18n();
  const { landmarks, landmarkId, select } = useLandmarks();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<SosKind | null>(null);
  const [showArea, setShowArea] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [routeText, setRouteText] = useState("");
  const [offline, setOffline] = useState(false);
  const [phone, setPhone] = useState("");
  const [needsMedical, setNeedsMedical] = useState(false);
  const [ticketId, setTicketId] = useState(() => readJson<SosEvent>(storageKeys.ticket)?.id ?? "");

  const place = landmarks.find((item) => item.id === landmarkId);

  useEffect(() => {
    setPhone(readPhone());
  }, []);

  function pickArea(id: string) {
    const hit = landmarks.find((row) => row.id === id);
    if (hit) rememberLandmark(hit, "cell");
    select(id);
  }

  async function send(kind: SosKind) {
    setPicked(kind);
    setBusy(true);
    setStatus("");
    setOk(false);
    setRouteText("");
    setOffline(false);
    const injured = needsMedical || kind === "medical";
    try {
      const event = await api<SosEvent>("/api/v1/sos", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({
          kind,
          landmark_id: landmarkId,
          source: "pwa",
          phone: phone || null,
          needs_medical: injured,
        }),
      });
      writeJson(storageKeys.ticket, event);
      setTicketId(event.id);
      setOk(true);
      setStatus(t("home.ticketLogged", { place: place?.name ?? "" }));
      setOpen(false);
      setPicked(null);
      try {
        const route = await api<RouteResult>("/api/v1/routes", {
          method: "POST",
          body: JSON.stringify({ from_landmark: landmarkId }),
        });
        writeJson(storageKeys.route, route);
        setRouteText(route.ussd_text);
      } catch {
        /* SOS still counts */
      }
    } catch (error) {
      setOffline(error instanceof ApiError && error.status === 0);
      setStatus(t("home.offline"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <AlertStrip />

      <section id="sos" className="sos-hero">
        <div className="section-head">
          <h2>{t("home.sosTitle")}</h2>
        </div>
        <button
          className="sos"
          type="button"
          disabled={busy}
          onClick={() => {
            setPicked(null);
            setOpen(true);
          }}
        >
          SOS
        </button>
        <p className="hint sos-hint">{t("home.sosHint")}</p>
        <button className="area-chip" type="button" onClick={() => setShowArea((value) => !value)}>
          <span>
            <small>{t("home.from")}</small>
            <b>{place?.name ?? t("landmark.label")}</b>
          </span>
          <em>{showArea ? t("home.hideArea") : t("home.changeArea")}</em>
        </button>
        {showArea ? (
          <div className="area-edit">
            <LocationOptIn landmarks={landmarks} onSelect={select} />
            <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={pickArea} />
          </div>
        ) : null}
        {ticketId ? null : (
          <ProcessSteps steps={[t("home.step1"), t("home.step2"), t("home.step3"), t("home.step4")]} current={0} />
        )}
        {status ? <p className={ok ? "msg" : "err"}>{status}</p> : null}
        {ticketId ? <TicketPanel ticketId={ticketId} routeText={routeText} placeName={place?.name} /> : null}
        {routeText && !ticketId ? (
          <div className="msg">
            <p>{routeText}</p>
            <button className="speak" type="button" onClick={() => speakRoute(routeText)}>
              {t("route.speak")}
            </button>
          </div>
        ) : null}
        {offline ? <p className="hint">{t("home.offlineHint")}</p> : null}
      </section>

      <section>
        <div className="section-head">
          <h2>{t("home.next")}</h2>
        </div>
        <div className="actions">
          <ActionCard href="/route" title={t("home.cardRoute")} hint={t("home.cardRouteHint")} icon={<IconRoute />} />
          <ActionCard href="/report" title={t("home.cardReport")} hint={t("home.cardReportHint")} icon={<IconReport />} />
          <ActionCard href="/alerts" title={t("home.cardAlerts")} hint={t("home.cardAlertsHint")} icon={<IconAlert />} />
          <ActionCard href="/whatsapp" title={t("home.cardWa")} hint={t("home.cardWaHint")} icon={<IconWhatsApp />} />
        </div>
      </section>

      <UssdFallback extra={t("home.ussd1")} />

      {open ? (
        <div className="sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="sos-title">
          <div className="sheet-card">
            <h2 id="sos-title">{t("home.what")}</h2>
            <p className="lede">{t("home.sendingFrom", { place: place?.name ?? "" })}</p>
            <label className="triage">
              <input
                type="checkbox"
                checked={needsMedical}
                onChange={(event) => setNeedsMedical(event.target.checked)}
              />
              <span>{t("home.medical")}</span>
            </label>
            {KIND_KEYS.map((kind) => {
              const Icon = kind.icon;
              const active = picked === kind.id;
              return (
                <button
                  key={kind.id}
                  className={active ? "choice picked" : "choice"}
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => send(kind.id)}
                >
                  <span className="choice-icon">
                    <Icon />
                  </span>
                  <span className="choice-copy">
                    <b>{t(kind.label)}</b>
                    <small>{active && busy ? t("home.sending") : t(kind.hint)}</small>
                  </span>
                  {active ? (
                    <span className="choice-tick">
                      <IconCheck />
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              className="choice ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPicked(null);
              }}
            >
              {t("home.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
