"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, USSD_CODE, postUssd } from "@/lib/api";
import { maskPhone, readPhone } from "@/lib/location";
import { useI18n } from "@/lib/i18n";

const KEYS: { digit: string; letters?: string }[] = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*" },
  { digit: "0", letters: "+" },
  { digit: "#" },
];

function parseReply(raw: string): { kind: "con" | "end"; body: string } {
  if (raw.startsWith("END ")) return { kind: "end", body: raw.slice(4) };
  if (raw.startsWith("CON ")) return { kind: "con", body: raw.slice(4) };
  if (raw.startsWith("END")) return { kind: "end", body: raw.slice(3).trim() };
  if (raw.startsWith("CON")) return { kind: "con", body: raw.slice(3).trim() };
  return { kind: "end", body: raw };
}

function newSessionId() {
  return `ussd-sim-${crypto.randomUUID()}`;
}

export function UssdPhone() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("+254700000000");
  const [clock, setClock] = useState("12:00");
  const [sessionId, setSessionId] = useState(newSessionId);
  const [dial, setDial] = useState(USSD_CODE);
  const [path, setPath] = useState("");
  const [reply, setReply] = useState("");
  const [screen, setScreen] = useState("");
  const [phase, setPhase] = useState<"idle" | "session" | "end">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPhone(readPhone() || "+254700000000");
  }, []);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Africa/Nairobi",
        }),
      );
    };
    tick();
    const iv = window.setInterval(tick, 15000);
    return () => window.clearInterval(iv);
  }, []);

  const lcd = useMemo(() => {
    if (error) return error;
    if (busy && !screen) return t("ussd.connecting");
    if (phase === "idle") return dial || t("ussd.idle");
    const typed = reply ? `\n\n> ${reply}` : "";
    return `${screen}${typed}`;
  }, [busy, dial, error, phase, reply, screen, t]);

  async function submit(nextText: string) {
    setBusy(true);
    setError("");
    try {
      const raw = await postUssd({ sessionId, phoneNumber: phone, text: nextText });
      const parsed = parseReply(raw);
      setScreen(parsed.body);
      setPath(nextText);
      setReply("");
      setPhase(parsed.kind === "end" ? "end" : "session");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? t("ussd.offline") : t("ussd.offline"));
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }

  function press(digit: string) {
    if (busy) return;
    setError("");
    if (phase === "idle") setDial((current) => `${current}${digit}`.slice(0, 18));
    else if (phase === "session") setReply((current) => `${current}${digit}`.slice(0, 8));
  }

  function del() {
    if (busy) return;
    if (phase === "idle") setDial((current) => current.slice(0, -1));
    else if (phase === "session") setReply((current) => current.slice(0, -1));
  }

  function hang() {
    setSessionId(newSessionId());
    setPath("");
    setReply("");
    setScreen("");
    setDial(USSD_CODE);
    setPhase("idle");
    setError("");
    setBusy(false);
  }

  function green() {
    if (busy) return;
    if (phase === "end") {
      hang();
      return;
    }
    if (phase === "idle") {
      void submit("");
      return;
    }
    const next = path ? `${path}*${reply || ""}` : reply;
    if (!next) return;
    void submit(next.replace(/\*+$/, ""));
  }

  const greenLabel = phase === "idle" ? t("ussd.call") : phase === "end" ? t("ussd.ok") : t("ussd.send");

  return (
    <div className="feature-phone" aria-label="USSD phone simulator">
      <div className="feature-ear" />
      <div className="lcd">
        <div className="lcd-bar">
          <span>{t("ussd.network")}</span>
          <span>{clock}</span>
          <span aria-hidden>▮▮▮</span>
        </div>
        <pre className="lcd-body">{lcd}</pre>
        <div className="lcd-hint">{t("ussd.using", { phone: maskPhone(phone) })}</div>
      </div>
      <div className="soft-row">
        <button type="button" className="soft-key" onClick={del} disabled={busy}>
          {t("ussd.back")}
        </button>
        <button type="button" className="soft-key" onClick={() => (phase === "idle" ? setDial("") : setReply(""))} disabled={busy}>
          {t("ussd.clear")}
        </button>
      </div>
      <div className="call-row">
        <button type="button" className="call-btn hang" onClick={hang} aria-label={t("ussd.hang")}>
          ⌕
        </button>
        <button type="button" className="nav-pad" aria-hidden>
          ▲
          <span>OK</span>
          ▼
        </button>
        <button type="button" className="call-btn talk" onClick={green} disabled={busy} aria-label={greenLabel}>
          ⌕
        </button>
      </div>
      <div className="keypad">
        {KEYS.map((key) => (
          <button key={key.digit} type="button" className="pad-key" onClick={() => press(key.digit)} disabled={busy}>
            <b>{key.digit}</b>
            {key.letters ? <small>{key.letters}</small> : <small>&nbsp;</small>}
          </button>
        ))}
      </div>
      <p className="phone-caption">{greenLabel} · {t("ussd.reply")}</p>
    </div>
  );
}
