"use client";

<<<<<<< HEAD
import { useEffect, useState } from "react";
import { UssdFallback } from "@/components/UssdFallback";
import { api, type AlertStatus } from "@/lib/api";
import { readJson, storageKeys, writeJson } from "@/lib/storage";

export default function AlertsPage() {
  const [alert, setAlert] = useState<AlertStatus | null>(() => readJson<AlertStatus>(storageKeys.alert));
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    api<AlertStatus>("/api/v1/alerts")
      .then((data) => {
        writeJson(storageKeys.alert, data);
        setAlert(data);
        setFromCache(false);
      })
      .catch(() => {
        const saved = readJson<AlertStatus>(storageKeys.alert);
        if (saved) {
          setAlert(saved);
          setFromCache(true);
        }
      });
  }, []);

  return (
    <>
      <p className="steps">4 of 4 · same as USSD option 4</p>
      <h1>Local alert</h1>
      {alert ? (
        <p className={alert.el_nino_mode ? "msg warn" : "msg"}>
          <strong>{alert.headline}</strong>
          <br />
          <br />
          {alert.detail}
          {fromCache ? <span className="offline"> · saved on this phone</span> : null}
        </p>
      ) : (
        <p className="err">Alerts unavailable. Dial *384*55# option 4.</p>
      )}
      <UssdFallback extra="Option 4 is Alert status." />
=======
export default async function AlertsPage() {
  let headline = "⚠️ Alerts Unavailable";
  let detail = "Start the FastAPI engine or dial *384*55# option 4.";
  let available = false;

  try {
    const data = await api<{ headline: string; detail: string }>("/api/v1/alerts");
    headline = data.headline;
    detail = data.detail;
    available = true;
  } catch {
    /* keep fallback */
  }

  return (
    <>
      <h1>🚨 Local Alert</h1>
      
      <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 20px 0" }}>
        Check critical safety alerts for your area
      </p>

      <div className={available ? "msg" : "card error"}>
        {available ? (
          <>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 700 }}>
              {headline}
            </h2>
            <p style={{ margin: "0", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
              {detail}
            </p>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 700 }}>
              {headline}
            </h2>
            <p style={{ margin: "0", fontSize: "14px" }}>
              {detail}
            </p>
          </>
        )}
      </div>

      <div className="card success" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px 0", color: "var(--teal)", fontSize: "16px" }}>
          💡 Alert Information
        </h3>
        <p style={{ margin: "0", fontSize: "13px", color: "var(--muted)", lineHeight: "1.7" }}>
          Stay informed about weather warnings, flood alerts, and community safety updates. Check back frequently during rainy seasons or when alerts are active.
        </p>
      </div>

      <div style={{
        background: "rgba(196, 69, 54, 0.05)",
        border: "1px solid rgba(196, 69, 54, 0.1)",
        borderRadius: "var(--border-radius-md)",
        padding: "16px",
        marginTop: "20px",
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: "var(--sos)", fontSize: "16px" }}>
          📞 Emergency Hotline
        </h3>
        <p style={{ margin: "0", fontSize: "14px", color: "var(--sos)", fontWeight: 600 }}>
          Dial: <strong>*384*55#</strong>
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
          Available 24/7 for emergencies and alert inquiries
        </p>
      </div>
>>>>>>> 7391bf5 (Modernize Ramani frontend: community app with interactive emergency response UI and planner app with dark-themed climate dashboard)
    </>
  );
}
