import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import type { ListingsPageResponse } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Inbox, PlusCircle, RotateCcw } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ListingCard from "@/components/ListingCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 12;

const Listings = () => {
  const { t } = useTranslation();
  usePageTitle(t("titles.listings"));
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("categorie") || "all");
  const [listingType, setListingType] = useState(searchParams.get("type") || "all");
  const [sortBy, setSortBy] = useState("recent");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setCategory(searchParams.get("categorie") || "all");
  }, [searchParams]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["listings", search, category, listingType, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      if (listingType !== "all") params.set("listing_type", listingType);
      params.set("sort", sortBy);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return api<ListingsPageResponse>(`/api/listings?${params.toString()}`);
    },
  });

  const listings = data?.items;
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const hasActiveFilters = useMemo(
    () =>
      Boolean(search.trim()) ||
      category !== "all" ||
      listingType !== "all" ||
      sortBy !== "recent",
    [search, category, listingType, sortBy]
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
    setSearchParams(params);
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setListingType("all");
    setSortBy("recent");
    setSearchParams(new URLSearchParams());
  };

  const showSkeleton = isLoading && !data;

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
        <p className="text-sm text-muted-foreground">{countLabel}</p>
        {isFetching && !showSkeleton && (
          <span className="text-xs text-muted-foreground">{t("listings.updating")}</span>
        )}
      </div>

      {showSkeleton ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-card">
              <div className="aspect-square animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : listings && listings.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
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
        <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/20">
          <CardContent className="flex flex-col items-center gap-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Inbox className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="font-heading text-xl font-semibold">
                {hasActiveFilters ? t("listings.emptyTitleFiltered") : t("listings.emptyTitleDefault")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? t("listings.emptyDescFiltered") : t("listings.emptyDescDefault")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
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
            </div>
            {import.meta.env.DEV && !hasActiveFilters && (
              <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
                {t("listings.devHint")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Listings;
