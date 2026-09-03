"use client";

import Link from "next/link";
import type { AreaDetail } from "@/lib/api";
import { ProcessSteps } from "./ProcessSteps";
import { useI18n } from "@/lib/i18n";

export function AreaSheet({
  detail,
  onClose,
  onUseHere,
}: {
  detail: AreaDetail;
  onClose: () => void;
  onUseHere: (id: string) => void;
}) {
  const { t } = useI18n();
  const kicker = detail.alarm ? t("area.danger") : detail.safe_haven ? t("area.haven") : t("area.yours");
  const steps = detail.alarm
    ? [t("area.stepDanger1"), t("area.stepDanger2"), t("area.stepDanger3")]
    : detail.safe_haven
      ? [t("area.stepSafe1"), t("area.stepSafe2"), t("area.stepSafe3")]
      : [t("area.stepCalm1"), t("area.stepCalm2"), t("area.stepCalm3")];
  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="area-title">
      <div className="sheet-card">
        <p className="area-kicker">{kicker}</p>
        <h2 id="area-title">{detail.name}</h2>
        {detail.alarm ? <span className="alarm-badge">{t("area.alarm")}</span> : null}
        <p className="lede">{detail.blurb}</p>
        {detail.cvi != null ? <p className="hint">{t("area.cvi", { score: detail.cvi.toFixed(2), priority: detail.priority })}</p> : null}
        <ProcessSteps steps={steps} current={detail.alarm ? 0 : 1} />
        {detail.help[0] ? <p className="hint">{detail.help[0].hint}</p> : null}
        <div className="follow">
          <button className="primary" type="button" onClick={() => onUseHere(detail.id)}>
            {t("area.use")}
          </button>
          <Link className="choice" href="/#sos" onClick={() => onUseHere(detail.id)}>
            <b>{t("area.sos")}</b>
            <small>{t("area.sosHint")}</small>
          </Link>
          <Link className="choice" href="/route">
            <b>{t("area.route")}</b>
            <small>{t("area.routeHint")}</small>
          </Link>
          <Link className="choice" href="/report">
            <b>{t("area.report")}</b>
            <small>{t("area.reportHint")}</small>
          </Link>
          <button className="choice ghost" type="button" onClick={onClose}>
            {t("area.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
