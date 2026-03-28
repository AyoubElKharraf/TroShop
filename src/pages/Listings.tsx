import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import type { ListingsPageResponse } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/EmptyState";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Inbox, PlusCircle, RotateCcw } from "lucide-react";
import { ErrorStatePanel } from "@/components/ErrorStatePanel";
import { useState, useEffect, useMemo } from "react";
import ListingCard from "@/components/ListingCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const PAGE_SIZE = 12;

const Listings = () => {
  const { t } = useTranslation();
  usePageTitle(t("titles.listings"));
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("categorie") || "all");
  const [listingType, setListingType] = useState(searchParams.get("type") || "all");
  const [availableOnly, setAvailableOnly] = useState(searchParams.get("available") !== "0");
  const [sortBy, setSortBy] = useState("recent");
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setCategory(searchParams.get("categorie") || "all");
    setAvailableOnly(searchParams.get("available") !== "0");
  }, [searchParams]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["listings", search, category, listingType, availableOnly, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      if (listingType !== "all") params.set("listing_type", listingType);
      params.set("available", availableOnly ? "1" : "0");
      params.set("sort", sortBy);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return api<ListingsPageResponse>(`/api/listings?${params.toString()}`);
    },
  });

  const listings = data?.items;
  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorite-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await api<{ ids: string[] }>("/api/me/favorites/ids");
      return res.ids || [];
    },
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

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

  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const hasActiveFilters = useMemo(
    () =>
      Boolean(search.trim()) ||
      category !== "all" ||
      listingType !== "all" ||
      !availableOnly ||
      sortBy !== "recent",
    [search, category, listingType, availableOnly, sortBy]
  );

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category !== "all") params.set("categorie", category);
    if (!availableOnly) params.set("available", "0");
    setSearchParams(params);
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setListingType("all");
    setAvailableOnly(true);
    setSortBy("recent");
    setSearchParams(new URLSearchParams());
  };

  const showSkeleton = isLoading && !data;
  const errorMessage = error instanceof Error ? error.message : String(error);

  const countLabel =
    total === 0
      ? t("listings.metaNone")
      : total === 1
        ? t("listings.metaOne", { page, totalPages })
        : t("listings.metaMany", { total, page, totalPages });

  return (
    <div className="container py-8">
      <h1 className="mb-2 font-heading text-3xl font-bold">{t("listings.pageTitle")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("listings.intro")}</p>

      <form
        onSubmit={handleSearch}
        className="mb-6 flex flex-col gap-3 rounded-xl border bg-card/50 p-4 shadow-sm md:flex-row md:flex-wrap md:items-end"
      >
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("listings.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label={t("listings.searchAria")}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder={t("listings.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("listings.categoryAll")}</SelectItem>
            <SelectItem value="vetements">{t("home.cat.vetements")}</SelectItem>
            <SelectItem value="livres">{t("home.cat.livres")}</SelectItem>
            <SelectItem value="materiel">{t("home.cat.materiel")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={listingType} onValueChange={setListingType}>
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder={t("listings.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("listings.typeAll")}</SelectItem>
            <SelectItem value="vente">{t("listings.typeSale")}</SelectItem>
            <SelectItem value="location">{t("listings.typeRent")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[170px]">
            <SelectValue placeholder={t("listings.sort")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t("listings.sortRecent")}</SelectItem>
            <SelectItem value="price_asc">{t("listings.sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("listings.sortPriceDesc")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2">
          <Switch
            id="available-only"
            checked={availableOnly}
            onCheckedChange={setAvailableOnly}
            aria-label={t("listings.availableOnly")}
          />
          <label htmlFor="available-only" className="text-sm text-muted-foreground">
            {t("listings.availableOnly")}
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="font-heading font-semibold">
            {t("listings.apply")}
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="outline" onClick={resetFilters} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              {t("listings.reset")}
            </Button>
          )}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{isError ? "—" : countLabel}</p>
        {isFetching && !showSkeleton && !isError && (
          <span className="text-xs text-muted-foreground">{t("listings.updating")}</span>
        )}
      </div>

      {isError ? (
        <ErrorStatePanel
          title={t("listings.loadError")}
          description={errorMessage}
          onRetry={() => void refetch()}
          retryLabel={t("common.retry")}
        />
      ) : showSkeleton ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : listings && listings.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((listing, idx) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.14) }}
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
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> {t("listings.prev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="gap-1"
              >
                {t("listings.next")} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <EmptyState
            icon={Inbox}
            title={hasActiveFilters ? t("listings.emptyTitleFiltered") : t("listings.emptyTitleDefault")}
            description={hasActiveFilters ? t("listings.emptyDescFiltered") : t("listings.emptyDescDefault")}
            showCatalogIllustration={!hasActiveFilters}
          >
            {user?.role === "admin" && (
              <Button asChild className="gap-2 font-heading font-semibold">
                <Link to="/annonces/nouvelle">
                  <PlusCircle className="h-4 w-4" />
                  {t("listings.publish")}
                </Link>
              </Button>
            )}
            {hasActiveFilters && (
              <Button type="button" variant="outline" onClick={resetFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t("listings.showAll")}
              </Button>
            )}
          </EmptyState>
          {import.meta.env.DEV && !hasActiveFilters && (
            <p className="mx-auto mt-6 max-w-lg text-center text-xs leading-relaxed text-muted-foreground">
              {t("listings.devHint")}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default Listings;
