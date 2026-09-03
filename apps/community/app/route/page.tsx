"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LandmarkSelect } from "@/components/LandmarkSelect";
import { PageFrame } from "@/components/PageFrame";
import { ProcessSteps } from "@/components/ProcessSteps";
import { SchemaMap } from "@/components/SchemaMap";
import { UssdFallback } from "@/components/UssdFallback";
import { api, ApiError, type RouteResult, type WhatsAppDispatch } from "@/lib/api";
import { useLandmarks } from "@/lib/useLandmarks";
import { readJson, storageKeys, writeJson } from "@/lib/storage";
import { speakRoute, stopSpeaking } from "@/lib/speak";
import { readPhone } from "@/lib/location";
import { useI18n } from "@/lib/i18n";

export default function RoutePage() {
  const { t } = useI18n();
  const { landmarks, landmarkId, select } = useLandmarks();
  const [result, setResult] = useState<RouteResult | null>(() => readJson<RouteResult>(storageKeys.route));
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wa, setWa] = useState<WhatsAppDispatch | null>(null);

  useEffect(() => {
    const saved = readJson<RouteResult>(storageKeys.route);
    if (saved) {
      setResult(saved);
      setCached(true);
    }
  }, []);

  async function load() {
    setBusy(true);
    setError("");
    setCached(false);
    setWa(null);
    try {
      const data = await api<RouteResult>("/api/v1/routes", {
        method: "POST",
        body: JSON.stringify({ from_landmark: landmarkId }),
      });
      writeJson(storageKeys.route, data);
      setResult(data);
    } catch (err) {
      const saved = readJson<RouteResult>(storageKeys.route);
      if (saved) {
        setResult(saved);
        setCached(true);
        setError(t("route.cached"));
      } else if (err instanceof ApiError && err.status === 409) {
        setError(err.message || t("route.stale"));
      } else {
        setError(t("route.none"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function shareWhatsApp() {
    setBusy(true);
    try {
      const payload = await api<WhatsAppDispatch>("/api/v1/whatsapp/dispatch", {
        method: "POST",
        body: JSON.stringify({
          action: "route",
          landmark_id: landmarkId,
          phone: readPhone() || null,
        }),
      });
      setWa(payload);
      if (payload.wa_url) window.open(payload.wa_url, "_blank");
    } catch {
      setError(t("route.waFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <SchemaMap hereId={landmarkId} onSelect={select} />
      <div className="section-head">
        <h2>{t("route.title")}</h2>
      </div>
      <p className="lede">{t("route.lede")}</p>
      <ProcessSteps steps={[t("route.step1"), t("route.step2"), t("route.step3")]} current={result ? 2 : 0} />
      <LandmarkSelect landmarks={landmarks} value={landmarkId} onChange={select} />
      <button className="primary" type="button" disabled={busy} onClick={load}>
        {busy ? t("route.busy") : t("route.get")}
      </button>
      {result ? (
        <div className={cached ? "msg warn" : "msg"}>
          <strong>{t("route.ready")}</strong>
          <p>{result.ussd_text}</p>
          <div className="follow">
            <button className="speak" type="button" onClick={() => speakRoute(`${result.ussd_text}. ${result.disclaimer}`)}>
              {t("route.speak")}
            </button>
            <button className="speak" type="button" onClick={stopSpeaking}>
              {t("route.stop")}
            </button>
            <button className="speak" type="button" disabled={busy} onClick={() => void shareWhatsApp()}>
              {t("route.wa")}
            </button>
            <Link className="speak" href="/report">
              {t("route.blocked")}
            </Link>
          </div>
          {result.names?.length ? (
            <div className="names">
              {result.names.map((name) => (
                <span className="chip" key={name}>
                  {name}
                </span>
              ))}
            </div>
          ) : null}
          <p className="hint">{result.disclaimer}</p>
        </div>
      ) : null}
      {wa ? (
        <div className="msg">
          <strong>{t("route.packet")}</strong>
          <p>{wa.message}</p>
          {wa.wa_url ? (
            <a className="speak" href={wa.wa_url} target="_blank" rel="noreferrer">
              {t("route.openWa")}
            </a>
          ) : (
            <button className="speak" type="button" onClick={() => navigator.clipboard.writeText(wa.message)}>
              {t("route.copy")}
            </button>
          )}
        </div>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
      <UssdFallback extra={t("route.ussd")} />
    </PageFrame>
  );
}
