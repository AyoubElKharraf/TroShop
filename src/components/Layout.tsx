import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Layout = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="skip-to-main"
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById("main-content");
          el?.focus({ preventScroll: true });
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        {t("a11y.skipToContent")}
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 outline-none" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
