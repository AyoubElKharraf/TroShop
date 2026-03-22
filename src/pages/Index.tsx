import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Shirt, BookOpen, Cpu, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing, ListingsPageResponse } from "@/types/domain";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingCard from "@/components/ListingCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  { key: "vetements", icon: Shirt, color: "bg-primary/10 text-primary" },
  { key: "livres", icon: BookOpen, color: "bg-secondary/10 text-secondary" },
  { key: "materiel", icon: Cpu, color: "bg-accent/20 text-accent-foreground" },
];

const Index = () => {
  const { t } = useTranslation();
  usePageTitle(t("titles.home"));
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: recentData } = useQuery({
    queryKey: ["recent-listings"],
    queryFn: async () =>
      api<ListingsPageResponse>("/api/listings?page=1&pageSize=8&sort=recent"),
  });
  const recentListings: Listing[] | undefined = recentData?.items;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/annonces?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 py-16 md:py-24">
        <div className="container text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-4xl font-extrabold tracking-tight md:text-6xl"
          >
            {t("home.heroTitle1")}
            <br />
            <span className="text-primary">{t("home.heroTitle2")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground"
          >
            {t("home.heroSubtitle")}
          </motion.p>
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex max-w-md gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("home.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" className="font-heading font-semibold">{t("home.search")}</Button>
          </motion.form>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="mb-6 font-heading text-2xl font-bold">{t("home.categoriesTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((cat) => (
            <Link key={cat.key} to={`/annonces?categorie=${cat.key}`}>
              <Card className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-xl p-3 ${cat.color} transition-transform group-hover:scale-110`}>
                    <cat.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-bold">{t(`home.cat.${cat.key}`)}</h3>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold">{t("home.recentTitle")}</h2>
          <Link to="/annonces">
            <Button variant="ghost" className="gap-1 text-primary">
              {t("home.seeAll")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {recentListings && recentListings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <p className="text-muted-foreground">{t("home.emptyCatalog")}</p>
            {import.meta.env.DEV && (
              <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {t("home.devHint")}
              </p>
            )}
            {user?.role === "admin" && (
              <Link to="/annonces/nouvelle">
                <Button className="mt-4 font-heading font-semibold">{t("nav.publish")}</Button>
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
};

export default Index;
