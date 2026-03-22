import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";

const MentionsLegales = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t("titles.legal"));

  return (
    <div className="container max-w-3xl space-y-6 py-12 text-sm leading-relaxed text-foreground">
      {i18n.language === "en" && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">{t("legal.notice")}</p>
      )}
      <h1 className="font-heading text-3xl font-bold">Mentions légales</h1>
      <p className="text-muted-foreground text-sm">Dernière mise à jour : mars 2026</p>

      <h2 className="mt-8 font-heading text-xl font-semibold">Éditeur du site</h2>
      <p>
        Le site <strong>TrocSpot</strong> est édité dans le cadre d’un projet personnel / associatif.
        Pour toute question : utilisez les coordonnées fournies par l’hébergeur de votre déploiement ou le contact
        affiché sur votre instance en production.
      </p>

      <h2 className="mt-8 font-heading text-xl font-semibold">Hébergement</h2>
      <p>
        Les informations relatives à l’hébergeur (nom, adresse) doivent être complétées selon votre prestataire
        (OVH, Scaleway, VPS, etc.) lorsque vous déployez l’application en ligne.
      </p>

      <h2 className="mt-8 font-heading text-xl font-semibold">Propriété intellectuelle</h2>
      <p>
        Les contenus publiés par les utilisateurs (textes, photos) restent leur propriété. Ils concèdent à la plateforme
        le droit de les afficher dans le cadre du service. La marque et l’interface TrocSpot ne peuvent être réutilisées
        sans accord.
      </p>
    </div>
  );
};

export default MentionsLegales;
