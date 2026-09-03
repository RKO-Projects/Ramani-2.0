"use client";

import { PageFrame } from "@/components/PageFrame";
import { UssdPhone } from "@/components/UssdPhone";
import { useI18n } from "@/lib/i18n";

export default function UssdPage() {
  const { t } = useI18n();
  return (
    <PageFrame
      hero={
        <div className="hero">
          <h1>{t("ussd.pageTitle")}</h1>
          <p>{t("ussd.pageLede")}</p>
        </div>
      }
    >
      <UssdPhone />
    </PageFrame>
  );
}
