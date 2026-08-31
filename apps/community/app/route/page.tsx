"use client";

import { useState } from "react";
import { api, LANDMARKS } from "@/lib/api";

type Route = { ussd_text: string; disclaimer: string };

export default function RoutePage() {
  const [from, setFrom] = useState("line-saba");
  const [result, setResult] = useState<Route | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await api<Route>("/api/v1/routes", {
        method: "POST",
        body: JSON.stringify({ from_landmark: from }),
      });
      setResult(data);
    } catch {
      setError("No route yet. Start the backend or use USSD option 2.");
    }
  }

  return (
    <>
      <h1>Evacuation route</h1>
      <label className="label">You are near</label>
      <select value={from} onChange={(event) => setFrom(event.target.value)}>
        {LANDMARKS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <div className="row">
        <button className="btn teal" onClick={load}>
          Get safe landmark route
        </button>
      </div>
      {result ? (
        <p className="msg">
          {result.ussd_text}
          <br />
          <br />
          {result.disclaimer}
        </p>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
    </>
  );
}
