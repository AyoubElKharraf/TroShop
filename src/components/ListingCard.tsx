import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageOff, MapPin, Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Listing } from "@/types/domain";

interface ListingCardProps {
  listing: Listing;
  isFavorite?: boolean;
  onToggleFavorite?: (listing: Listing) => Promise<void> | void;
  favoriteLoading?: boolean;
}

const ListingCard = ({ listing, isFavorite = false, onToggleFavorite, favoriteLoading = false }: ListingCardProps) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const firstImage = listing.images && listing.images.length > 0 ? listing.images[0] : null;

  useEffect(() => {
    setImgError(false);
  }, [listing.id, firstImage]);

  const showPhoto = Boolean(firstImage) && !imgError;

  const catLabel = t(`listing.categories.${listing.category}`, { defaultValue: listing.category });
  const periodKey = listing.price_period as "jour" | "semaine" | "mois" | undefined;
  const periodLabel = periodKey ? t(`listing.period.${periodKey}`, { defaultValue: periodKey }) : "";

  return (
    <Link
      to={`/annonces/${listing.id}`}
      className="block h-full rounded-xl outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="group relative h-full overflow-hidden rounded-xl border-2 border-transparent shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
        <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
          {showPhoto ? (
            <img
              src={firstImage!}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center text-muted-foreground">
              {firstImage ? (
                <>
                  <ImageOff className="h-10 w-10 opacity-50" />
                  <span className="text-xs">{t("listing.imageUnavailable")}</span>
                </>
              ) : (
                t("listing.noPhoto")
              )}
            </div>
          )}
        </div>
        {onToggleFavorite && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onToggleFavorite(listing);
            }}
            disabled={favoriteLoading}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={isFavorite ? t("favorites.remove") : t("favorites.add")}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
          </motion.button>
        )}
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {catLabel}
            </Badge>
            {listing.listing_type === "location" && (
              <Badge variant="outline" className="text-xs">{t("listing.rent")}</Badge>
            )}
            {listing.status !== "available" && (
              <Badge variant={listing.status === "sold" ? "destructive" : "outline"} className="text-xs">
                {t(`listing.status.${listing.status}`)}
              </Badge>
            )}
          </div>
          <h3 className="font-heading text-base font-bold leading-snug line-clamp-2 md:text-[1.05rem]">{listing.title}</h3>
          <p className="mt-1 text-lg font-bold text-primary">
            {listing.price.toFixed(2)} €
            {listing.listing_type === "location" && listing.price_period && (
              <span className="text-sm font-normal text-muted-foreground"> /{periodLabel}</span>
            )}
          </p>
          {listing.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {listing.location}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default ListingCard;
