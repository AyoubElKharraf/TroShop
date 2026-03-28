import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Listing } from "@/types/domain";
import { usePageTitle } from "@/hooks/usePageTitle";
import ListingCard from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ErrorStatePanel } from "@/components/ErrorStatePanel";
import { Heart, LayoutGrid } from "lucide-react";

const Favorites = () => {
  const { t } = useTranslation();
  usePageTitle(t("titles.favorites"));
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const {
    data: listings,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["my-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => api<Listing[]>("/api/me/favorites"),
  });

  const removeMutation = useMutation({
    mutationFn: (listingId: string) =>
      api(`/api/listings/${listingId}/favorite`, { method: "DELETE" }),
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({ queryKey: ["my-favorites", user?.id] });
      const prev = queryClient.getQueryData<Listing[]>(["my-favorites", user?.id]);
      queryClient.setQueryData<Listing[]>(["my-favorites", user?.id], (old) =>
        old ? old.filter((l) => l.id !== listingId) : []
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["my-favorites", user?.id], ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-favorites", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-ids", user?.id] });
    },
  });

  if (authLoading) {
    return (
      <div className="container py-8">
        <div className="mb-6 h-9 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const showSkeleton = isLoading && listings === undefined;

  return (
    <div className="container py-8">
      <h1 className="mb-2 font-heading text-3xl font-bold">{t("favorites.pageTitle")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("favorites.intro")}</p>

      {isError ? (
        <ErrorStatePanel
          title={t("favorites.loadError")}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {listings.map((listing, idx) => (
              <motion.div
                key={listing.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.14) }}
              >
                <ListingCard
                  listing={listing}
                  isFavorite
                  onToggleFavorite={async (l) => {
                    await removeMutation.mutateAsync(l.id);
                  }}
                  favoriteLoading={removeMutation.isPending && removeMutation.variables === listing.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title={t("favorites.emptyTitle")}
          description={t("favorites.emptyDesc")}
          showCatalogIllustration
        >
          <Button asChild className="gap-2 font-heading font-semibold">
            <Link to="/annonces">
              <LayoutGrid className="h-4 w-4" />
              {t("favorites.browseListings")}
            </Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
};

export default Favorites;
