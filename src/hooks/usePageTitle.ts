import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function usePageTitle(title?: string) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    const base = t("common.brand");
    if (!title) {
      document.title = base;
      return;
    }
    const short = title.length > 55 ? `${title.slice(0, 52)}…` : title;
    document.title = `${short} · ${base}`;
  }, [title, i18n.language, t]);
}
