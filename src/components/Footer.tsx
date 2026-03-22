import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandIcon } from "@/components/BrandIcon";

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-card">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary">
            <BrandIcon className="h-6 w-6" />
            {t("common.brand")}
          </Link>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground md:justify-end">
            <Link to="/annonces" className="hover:text-foreground transition-colors">{t("footer.listings")}</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">{t("footer.login")}</Link>
            <Link to="/mentions-legales" className="hover:text-foreground transition-colors">{t("footer.legal")}</Link>
            <Link to="/confidentialite" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
          </div>
          <p className="text-xs text-muted-foreground">{t("footer.rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
