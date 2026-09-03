"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readPhone, savePhone } from "@/lib/location";

export default function OnboardPage() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [existing, setExisting] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const phone = readPhone();
    setExisting(phone);
    setRaw(phone);
  }, []);

  function submit() {
    const phone = savePhone(raw);
    if (!phone) {
      setError("Enter a Kenyan mobile, e.g. 0712 345 678");
      return;
    }
    router.replace("/");
  }

  return (
    <div className="app onboard">
      <header className="mast mast-inner">
        <p className="ob-kicker">Ramani</p>
        <h1 className="ob-title">{existing ? "Update number" : "Your number"}</h1>
        <p className="ob-path">Phone only — no password, no place quiz. SOS uses this number and your live GPS.</p>
      </header>
      <div className="sheet">
        <label className="field">
          <span className="label">Mobile number</span>
          <span className="field-box">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setError("");
              }}
            />
          </span>
        </label>
        {error ? <p className="err">{error}</p> : null}
        <button className="primary" type="button" onClick={submit}>
          {existing ? "Save number" : "Continue"}
        </button>
        <p className="hint">Kenya numbers only (+254). Location is requested when you send SOS.</p>
      </div>
    </div>
  );
}
