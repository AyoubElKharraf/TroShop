import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import type { Listing, Profile } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Calendar, MessageCircle, ArrowLeft, Pencil, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";

const ListingDetail = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);

  const dateLocale = i18n.language === "en" ? "en-US" : "fr-FR";

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => api<Listing>(`/api/listings/${id!}`),
  });

  usePageTitle(listing?.title);

  const { data: seller } = useQuery({
    queryKey: ["seller", listing?.user_id],
    enabled: !!listing,
    queryFn: async () => api<Profile>(`/api/users/${listing!.user_id}/profile`),
  });

  const handleContact = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.id === listing?.user_id) {
      toast({ title: t("listingDetail.ownListing") });
      return;
    }

    try {
      const { id: convId } = await api<{ id: string }>("/api/conversations/open", {
        method: "POST",
        body: JSON.stringify({ listing_id: listing!.id }),
      });
      navigate(`/messages/${convId}`);
      toast({
        title: t("listingDetail.toastRequestTitle"),
        description: t("listingDetail.toastRequestDesc"),
      });
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("listingDetail.loadError"),
        variant: "destructive",
      });
    }
  };

  const submitReport = async () => {
    if (!listing || !user) return;
    setReportSending(true);
    try {
      await api(`/api/listings/${listing.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: reportReason }),
      });
      toast({ title: t("listingDetail.thanksReport"), description: t("listingDetail.thanksReportDesc") });
      setReportOpen(false);
      setReportReason("");
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.error"),
        variant: "destructive",
      });
    } finally {
      setReportSending(false);
    }
  };

  if (isLoading) {
    return <div className="container py-12 text-center text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!listing) {
    return <div className="container py-12 text-center text-muted-foreground">{t("listingDetail.notFound")}</div>;
  }

  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const isOwner = user?.role === "admin" && user?.id === listing.user_id;

  const catLabel = t(`listing.categories.${listing.category}`, { defaultValue: listing.category });
  const condLabel = t(`listing.conditions.${listing.condition}`, { defaultValue: listing.condition });
  const periodKey = listing.price_period as "jour" | "semaine" | "mois" | undefined;
  const periodLabel = periodKey ? t(`listing.period.${periodKey}`, { defaultValue: periodKey }) : "";

  return (
    <div className="container py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("listingDetail.back")}
      </button>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="aspect-square overflow-hidden rounded-xl bg-muted">
            {images.length > 0 ? (
              <img src={images[selectedImage]} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                {t("listing.noPhoto")}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${i === selectedImage ? "border-primary" : "border-transparent"}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{catLabel}</Badge>
            <Badge variant="outline">
              {listing.listing_type === "location" ? t("listing.rent") : t("listing.sale")}
            </Badge>
            <Badge variant="outline">{condLabel}</Badge>
            {!listing.is_active && <Badge variant="destructive">{t("listingDetail.hidden")}</Badge>}
          </div>
          <h1 className="font-heading text-2xl font-bold">{listing.title}</h1>
          <p className="mt-2 text-3xl font-bold text-primary">
            {listing.price.toFixed(2)} €
            {listing.listing_type === "location" && listing.price_period && (
              <span className="text-base font-normal text-muted-foreground"> /{periodLabel}</span>
            )}
          </p>
          {listing.location && (
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {listing.location}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" /> {new Date(listing.created_at).toLocaleDateString(dateLocale)}
          </p>

          <div className="mt-6 rounded-xl border p-4">
            <p className="whitespace-pre-wrap text-sm">{listing.description}</p>
          </div>

          {seller && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border p-4">
              <Avatar>
                <AvatarImage src={seller.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {seller.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("listingDetail.shop")}
                </p>
                <p className="font-heading font-bold">{seller.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("listingDetail.memberSince", {
                    date: new Date(seller.created_at).toLocaleDateString(dateLocale),
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {isOwner && (
              <Button asChild variant="secondary" className="w-full gap-2 font-heading font-semibold">
                <Link to={`/annonces/${listing.id}/modifier`}>
                  <Pencil className="h-4 w-4" /> {t("listingDetail.edit")}
                </Link>
              </Button>
            )}
            {!isOwner && (
              <Button onClick={handleContact} className="w-full gap-2 font-heading font-semibold" size="lg">
                <MessageCircle className="h-5 w-5" /> {t("listingDetail.requestProduct")}
              </Button>
            )}
            {user && !isOwner && (
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full gap-2 text-muted-foreground">
                    <Flag className="h-4 w-4" /> {t("listingDetail.report")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("listingDetail.reportTitle")}</DialogTitle>
                    <DialogDescription>{t("listingDetail.reportDesc")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="reason">{t("listingDetail.reportReason")}</Label>
                    <Textarea
                      id="reason"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      rows={4}
                      placeholder={t("listingDetail.reportPlaceholder")}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReportOpen(false)}>
                      {t("listingDetail.cancel")}
                    </Button>
                    <Button onClick={submitReport} disabled={reportSending || reportReason.trim().length < 10}>
                      {t("listingDetail.send")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
