import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Shirt, BookOpen, Cpu, ArrowRight, AlertCircle, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing, ListingsPageResponse } from "@/types/domain";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingCard from "@/components/ListingCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { TrustStrip } from "@/components/TrustStrip";
import { EmptyState } from "@/components/EmptyState";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";

const categories = [
  { key: "vetements", icon: Shirt, color: "bg-primary/10 text-primary" },
  { key: "livres", icon: BookOpen, color: "bg-secondary/10 text-secondary" },
  { key: "materiel", icon: Cpu, color: "bg-accent/20 text-accent-foreground" },
];

const Index = () => {
  const { t } = useTranslation();
  usePageTitle(t("titles.home"));
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: recentData, isLoading: recentLoading, isError: recentError, error: recentErr, refetch: refetchRecent } =
    useQuery({
      queryKey: ["recent-listings"],
      queryFn: async () =>
        api<ListingsPageResponse>("/api/listings?page=1&pageSize=8&sort=recent"),
    });
  const recentListings: Listing[] | undefined = recentData?.items;
  const recentErrorMessage = recentErr instanceof Error ? recentErr.message : String(recentErr ?? "");

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorite-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await api<{ ids: string[] }>("/api/me/favorites/ids");
      return res.ids || [];
    },
  });

  const favoriteSet = new Set(favoriteIds);

  const toggleFavorite = async (listingId: string) => {
    if (!user) return;
    setFavoriteBusyId(listingId);
    try {
      if (favoriteSet.has(listingId)) {
        await api(`/api/listings/${listingId}/favorite`, { method: "DELETE" });
      } else {
        await api(`/api/listings/${listingId}/favorite`, { method: "POST" });
      }
      await queryClient.invalidateQueries({ queryKey: ["favorite-ids", user.id] });
    } finally {
      setFavoriteBusyId(null);
    }
  };

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

      <TrustStrip />

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
        {recentError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-heading font-semibold">{t("home.recentLoadError")}</p>
                <p className="text-sm text-muted-foreground">{recentErrorMessage}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => void refetchRecent()} className="shrink-0">
                {t("common.retry")}
              </Button>
            </div>
          </div>
        ) : recentLoading && !recentData ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : recentListings && recentListings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentListings.map((listing, idx) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 + Math.min(idx * 0.03, 0.16) }}
              >
                <ListingCard
                  listing={listing}
                  isFavorite={favoriteSet.has(listing.id)}
                  onToggleFavorite={user ? async (l) => toggleFavorite(l.id) : undefined}
                  favoriteLoading={favoriteBusyId === listing.id}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            <EmptyState
              icon={Package}
              title={t("home.emptyStateTitle")}
              description={t("home.emptyCatalog")}
              showCatalogIllustration
            >
              {user?.role === "admin" && (
                <Button asChild className="font-heading font-semibold">
                  <Link to="/annonces/nouvelle">{t("nav.publish")}</Link>
                </Button>
              )}
            </EmptyState>
            {import.meta.env.DEV && (
              <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-muted-foreground">
                {t("home.devHint")}
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default Index;
