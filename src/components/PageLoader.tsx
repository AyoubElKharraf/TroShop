import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

/** Chargement route (Suspense) — centré, annoncé aux lecteurs d’écran. */
export function PageLoader() {
  const { t } = useTranslation();
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}
