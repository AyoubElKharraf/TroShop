import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MessageCircle, ShieldCheck, Scale } from "lucide-react";

/**
 * Bandeau court orienté confiance — formulations factuelles (pas de promesse légale non vérifiable).
 */
export function TrustStrip() {
  const { t } = useTranslation();
  const items = [
    { icon: MessageCircle, key: "messaging" as const },
    { icon: ShieldCheck, key: "safety" as const },
    { icon: Scale, key: "legal" as const },
  ];

  return (
    <div className="border-y bg-card/60 backdrop-blur-sm">
      <div className="container py-8 md:py-10">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("trust.eyebrow")}
        </p>
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {items.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-4 text-center shadow-sm sm:px-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <span className="font-heading text-sm font-semibold">{t(`trust.${key}.title`)}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{t(`trust.${key}.desc`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("trust.disclaimer")}{" "}
          <Link to="/confidentialite" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("trust.privacyLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
