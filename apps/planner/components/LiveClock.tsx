"use client";

import { useEffect, useState } from "react";

function getNairobiTime() {
  // EAT = UTC+3
  const now = new Date();
  return now.toLocaleTimeString("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getNairobiDate() {
  const now = new Date();
  return now.toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function LiveClock() {
  const [time, setTime] = useState(getNairobiTime());
  const [date, setDate] = useState(getNairobiDate());

  useEffect(() => {
    const iv = setInterval(() => {
      setTime(getNairobiTime());
      setDate(getNairobiDate());
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="live-clock" aria-live="off" aria-label={`Nairobi time: ${time}`}>
      <span className="live-clock-time">{time}</span>
      <span className="live-clock-date">{date} · EAT</span>
    </div>
  );
}
