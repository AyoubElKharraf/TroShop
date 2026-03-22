import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";

const Confidentialite = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t("titles.privacy"));

  return (
    <div className="container max-w-3xl space-y-6 py-12 text-sm leading-relaxed text-foreground">
      {i18n.language === "en" && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">{t("legal.notice")}</p>
      )}
      <h1 className="font-heading text-3xl font-bold">Politique de confidentialité</h1>
      <p className="text-muted-foreground text-sm">Dernière mise à jour : mars 2026</p>

      <h2 className="mt-8 font-heading text-xl font-semibold">Données collectées</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Compte : adresse e-mail, mot de passe (haché), nom affiché.</li>
        <li>Annonces et messages échangés sur la plateforme.</li>
        <li>Données techniques : journaux serveur (adresse IP, horodatage) selon configuration.</li>
      </ul>

      <h2 className="mt-8 font-heading text-xl font-semibold">Finalités</h2>
      <p>Fourniture du service (publication d’annonces, messagerie), sécurité, et obligations légales.</p>

      <h2 className="mt-8 font-heading text-xl font-semibold">Durée de conservation</h2>
      <p>
        Les données sont conservées tant que le compte est actif. Vous pouvez supprimer votre compte depuis
        « Mon compte » ; les données associées sont alors supprimées dans la limite des contraintes techniques
        (sauvegardes, logs).
      </p>

      <h2 className="mt-8 font-heading text-xl font-semibold">Vos droits (RGPD)</h2>
      <p>
        Accès, rectification, effacement, limitation, portabilité, opposition : contactez l’éditeur du site.
        Réclamation auprès de la CNIL (France) :{" "}
        <a href="https://www.cnil.fr" className="text-primary underline" target="_blank" rel="noreferrer">
          cnil.fr
        </a>
        .
      </p>

      <h2 className="mt-8 font-heading text-xl font-semibold">Cookies</h2>
      <p>
        L’application peut stocker un jeton de session (localStorage) pour vous maintenir connecté. Aucun cookie
        publicitaire n’est requis pour le fonctionnement de base.
      </p>
    </div>
  );
};

export default Confidentialite;
