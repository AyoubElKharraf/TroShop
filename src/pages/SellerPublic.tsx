import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing, Profile } from "@/types/domain";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, ArrowLeft } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useState } from "react";

const SellerPublic = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dateLocale = i18n.language === "en" ? "en-US" : "fr-FR";
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async () => api<Profile>(`/api/users/${userId!}/profile`),
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["public-seller-listings", userId],
    enabled: !!userId,
    queryFn: async () => api<Listing[]>(`/api/users/${userId!}/listings`),
  });

  usePageTitle(profile?.display_name ? t("seller.pageTitle", { name: profile.display_name }) : t("titles.seller"));

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

  if (!userId) {
    return null;
  }

  if (profileLoading) {
    return (
      <div className="container py-12 text-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">{t("seller.notFound")}</p>
        <Link to="/annonces" className="mt-4 inline-block text-primary underline">
          {t("seller.backToListings")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Link
        to="/annonces"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("seller.backToListings")}
      </Link>

      <div className="mb-8 flex flex-col gap-4 rounded-xl border bg-card/50 p-6 shadow-sm sm:flex-row sm:items-center sm:gap-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
            {profile.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-bold">{profile.display_name}</h1>
          {profile.location && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" /> {profile.location}
            </p>
          )}
          {profile.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed">{profile.bio}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {t("listingDetail.memberSince", {
              date: new Date(profile.created_at).toLocaleDateString(dateLocale),
            })}
          </p>
        </div>
      </div>

      <h2 className="mb-4 font-heading text-xl font-semibold">{t("seller.listingsHeading")}</h2>

      {listingsLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : listings && listings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing, idx) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.12) }}
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
        <p className="text-sm text-muted-foreground">{t("seller.noListings")}</p>
      )}
    </div>
  );
};

export default SellerPublic;
