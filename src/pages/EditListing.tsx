import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, ArrowLeft } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

const EditListing = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  usePageTitle("Modifier l’annonce");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "vetements",
    listing_type: "vente",
    price: "",
    price_period: "jour",
    condition: "bon",
    status: "available",
    location: "",
    is_active: true,
  });
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => api<Listing>(`/api/listings/${id!}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!listing || !user || authLoading) return;
    if (user.role !== "admin" || listing.user_id !== user.id) {
      toast({
        title: "Accès refusé",
        description: "Vous ne pouvez modifier que vos propres annonces (compte administrateur).",
        variant: "destructive",
      });
      navigate("/annonces", { replace: true });
      return;
    }
    setForm({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      listing_type: listing.listing_type,
      price: String(listing.price),
      price_period: listing.price_period || "jour",
      condition: listing.condition,
      status: listing.status || "available",
      location: listing.location || "",
      is_active: listing.is_active,
    });
    setExistingUrls(listing.images?.filter(Boolean) || []);
  }, [listing, user, authLoading, navigate, toast]);

  if (authLoading || isLoading || !listing) {
    return <div className="container py-12 text-center text-muted-foreground">Chargement...</div>;
  }

  if (!user || user.role !== "admin" || listing.user_id !== user.id) {
    return null;
  }

  const totalSlots = existingUrls.length + newFiles.length;

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - totalSlots;
    const toAdd = files.slice(0, remaining);
    setNewFiles((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setNewPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeExisting = (index: number) => {
    setExistingUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNew = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrls = [...existingUrls];
      if (newFiles.length > 0) {
        const fd = new FormData();
        newFiles.forEach((f) => fd.append("images", f));
        const { urls } = await api<{ urls: string[] }>("/api/upload/listing-images", {
          method: "POST",
          body: fd,
        });
        imageUrls = [...imageUrls, ...urls].slice(0, 5);
      }

      const lt = form.listing_type;
      await api(`/api/listings/${id!}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description,
          category: form.category,
          listing_type: lt,
          price: parseFloat(form.price) || 0,
          price_period: lt === "location" ? form.price_period : null,
          condition: form.condition,
          status: form.status,
          location: form.location || null,
          is_active: form.is_active,
          images: imageUrls,
        }),
      });
      toast({ title: "Annonce mise à jour !" });
      navigate(`/annonces/${id}`);
    } catch (err: unknown) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Link to={`/annonces/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour à l’annonce
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Modifier l’annonce</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="active" className="font-normal">Annonce visible</Label>
            </div>

            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vetements">Vêtements</SelectItem>
                    <SelectItem value="livres">Livres</SelectItem>
                    <SelectItem value="materiel">Matériel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vente">Vente</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prix (€)</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              {form.listing_type === "location" && (
                <div className="space-y-2">
                  <Label>Période</Label>
                  <Select value={form.price_period} onValueChange={(v) => setForm({ ...form, price_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jour">Par jour</SelectItem>
                      <SelectItem value="semaine">Par semaine</SelectItem>
                      <SelectItem value="mois">Par mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>État</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neuf">Neuf</SelectItem>
                    <SelectItem value="comme_neuf">Comme neuf</SelectItem>
                    <SelectItem value="bon">Bon état</SelectItem>
                    <SelectItem value="acceptable">Acceptable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Localisation</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Paris, Lyon..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="reserved">Réservé</SelectItem>
                  <SelectItem value="sold">Vendu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Photos (max 5)</Label>
              <div className="flex flex-wrap gap-3">
                {existingUrls.map((src, i) => (
                  <div key={`e-${i}`} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeExisting(i)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {newPreviews.map((src, i) => (
                  <div key={`n-${i}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-dashed border-primary/50">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeNew(i)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {totalSlots < 5 && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <ImagePlus className="h-6 w-6" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleNewImages} />
                  </label>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full font-heading font-semibold" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditListing;
