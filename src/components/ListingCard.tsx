import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageOff, MapPin } from "lucide-react";
import type { Listing } from "@/types/domain";

interface ListingCardProps {
  listing: Listing;
}

const ListingCard = ({ listing }: ListingCardProps) => {
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
    <Link to={`/annonces/${listing.id}`}>
      <Card className="group h-full overflow-hidden border-2 border-transparent transition-all hover:border-primary/20 hover:shadow-lg">
        <div className="aspect-square overflow-hidden bg-muted">
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
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {catLabel}
            </Badge>
            {listing.listing_type === "location" && (
              <Badge variant="outline" className="text-xs">{t("listing.rent")}</Badge>
            )}
          </div>
          <h3 className="font-heading font-bold leading-tight line-clamp-2">{listing.title}</h3>
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
