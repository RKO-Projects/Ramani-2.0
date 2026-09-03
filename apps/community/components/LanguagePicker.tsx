"use client";

import { LOCALES, useI18n, type LocaleId } from "@/lib/i18n";

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const everyday = LOCALES.filter((row) => row.group === "everyday");
  const indigenous = LOCALES.filter((row) => row.group === "indigenous");

  return (
    <label className={compact ? "lang-wrap compact" : "lang-wrap"}>
      {compact ? null : <span className="label">{t("header.language")}</span>}
      <select
        className={compact ? "lang-select compact" : "lang-select"}
        aria-label={t("header.language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleId)}
      >
        <optgroup label={t("lang.everyday")}>
          {everyday.map((row) => (
            <option key={row.id} value={row.id}>
              {row.native}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("lang.indigenous")}>
          {indigenous.map((row) => (
            <option key={row.id} value={row.id}>
              {row.native}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

export function LanguageChips() {
  const { locale, setLocale, t } = useI18n();
  const everyday = LOCALES.filter((row) => row.group === "everyday");
  const indigenous = LOCALES.filter((row) => row.group === "indigenous");

  return (
    <div className="lang-picker">
      <p className="label">{t("lang.choose")}</p>
      <p className="hint">{t("lang.hint")}</p>
      <p className="lang-group">{t("lang.everyday")}</p>
      <div className="lang-grid">
        {everyday.map((row) => (
          <button
            key={row.id}
            type="button"
            className={locale === row.id ? "lang-chip selected" : "lang-chip"}
            onClick={() => setLocale(row.id)}
          >
            <b>{row.native}</b>
            <small>{row.english}</small>
          </button>
        ))}
      </div>
      <p className="lang-group">{t("lang.indigenous")}</p>
      <div className="lang-grid">
        {indigenous.map((row) => (
          <button
            key={row.id}
            type="button"
            className={locale === row.id ? "lang-chip selected" : "lang-chip"}
            onClick={() => setLocale(row.id)}
          >
            <b>{row.native}</b>
            <small>{row.english}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
