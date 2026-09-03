"use client";

import Link from "next/link";
import type { AreaDetail } from "@/lib/api";
import { ProcessSteps } from "./ProcessSteps";

export function AreaSheet({
  detail,
  onClose,
  onUseHere,
}: {
  detail: AreaDetail;
  onClose: () => void;
  onUseHere: (id: string) => void;
}) {
  const kicker = detail.alarm ? "Danger zone" : detail.safe_haven ? "High ground" : "Your area";
  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="area-title">
      <div className="sheet-card">
        <p className="area-kicker">{kicker}</p>
        <h2 id="area-title">{detail.name}</h2>
        {detail.alarm ? <span className="alarm-badge">Alarm light — avoid if you can</span> : null}
        <p className="lede">{detail.blurb}</p>
        {detail.cvi != null ? <p className="hint">Climate vulnerability {detail.cvi.toFixed(2)} · {detail.priority}</p> : null}
        <ProcessSteps steps={detail.next_steps} current={detail.alarm ? 0 : 1} />
        {detail.help[0] ? <p className="hint">{detail.help[0].hint}</p> : null}
        <div className="follow">
          <button className="primary" type="button" onClick={() => onUseHere(detail.id)}>
            Use as my area
          </button>
          <Link className="choice" href="/#sos" onClick={() => onUseHere(detail.id)}>
            <b>Send SOS from here</b>
            <small>Hashed landmark, not live GPS</small>
          </Link>
          <Link className="choice" href="/route">
            <b>Get a text route</b>
            <small>Dry path to high ground</small>
          </Link>
          <Link className="choice" href="/report">
            <b>Report a blocked path</b>
            <small>This updates everyone&apos;s routes</small>
          </Link>
          <button className="choice ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
