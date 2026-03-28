import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandIcon } from "@/components/BrandIcon";

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-card">
      <div className="container py-8">
        <p className="mx-auto mb-8 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
          {t("footer.trustSummary")}
        </p>
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
          <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary">
            <BrandIcon className="h-6 w-6" />
            {t("common.brand")}
          </Link>
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground md:justify-end"
            aria-label={t("footer.navAria")}
          >
            <Link to="/annonces" className="transition-colors hover:text-foreground">
              {t("footer.listings")}
            </Link>
            <Link to="/auth" className="transition-colors hover:text-foreground">
              {t("footer.login")}
            </Link>
            <Link to="/mentions-legales" className="transition-colors hover:text-foreground">
              {t("footer.legal")}
            </Link>
            <Link to="/confidentialite" className="transition-colors hover:text-foreground">
              {t("footer.privacy")}
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">{t("footer.rights", { year })}</p>
      </div>
    </footer>
  );
};

export default Footer;
