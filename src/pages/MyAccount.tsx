import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Listing, Profile } from "@/types/domain";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Pencil, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import ListingCard from "@/components/ListingCard";
import { usePageTitle } from "@/hooks/usePageTitle";

const MyAccount = () => {
  const { t } = useTranslation();
  usePageTitle(t("titles.account"));
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: "", bio: "", location: "" });
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => api<Profile>("/api/profile"),
  });

  const { data: myListings, isLoading: listingsLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user && user.role === "admin",
    queryFn: async () => api<Listing[]>("/api/me/listings"),
  });

  const { data: prefs } = useQuery({
    queryKey: ["me-preferences", user?.id],
    enabled: !!user,
    queryFn: async () => api<{ notify_messages: boolean }>("/api/me/preferences"),
  });

  const [notifyMessages, setNotifyMessages] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (prefs) setNotifyMessages(prefs.notify_messages);
  }, [prefs]);

  useEffect(() => {
    if (profile) {
      setProfileForm({ display_name: profile.display_name, bio: profile.bio || "", location: profile.location || "" });
    }
  }, [profile]);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleProfileSave = async () => {
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      toast({ title: t("account.saved") });
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.error"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await api(`/api/listings/${listingId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast({ title: t("account.listingDeleted") });
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.error"),
        variant: "destructive",
      });
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await api("/api/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({ notify_messages: notifyMessages }),
      });
      queryClient.invalidateQueries({ queryKey: ["me-preferences"] });
      toast({ title: t("account.prefsSaved") });
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.error"),
        variant: "destructive",
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api("/api/me", { method: "DELETE" });
      setDeleteDialogOpen(false);
      signOut();
      queryClient.clear();
      toast({ title: t("account.deleted") });
      navigate("/");
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.error"),
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold">{t("account.title")}</h1>

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="profile">{t("account.tabProfile")}</TabsTrigger>
          <TabsTrigger value="preferences">{t("account.tabNotif")}</TabsTrigger>
          {user.role === "admin" && <TabsTrigger value="listings">{t("account.tabCatalog")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">{t("account.profileTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-heading text-lg font-bold">{profile?.display_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("auth.displayName")}</Label>
                    <Input value={profileForm.display_name} onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("account.bio")}</Label>
                    <Textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("account.location")}</Label>
                    <Input value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleProfileSave} className="font-heading font-semibold">{t("account.save")}</Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>{t("account.cancel")}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {profile?.bio && <p className="text-sm">{profile.bio}</p>}
                  {profile?.location && <p className="text-sm text-muted-foreground">📍 {profile.location}</p>}
                  <Button variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                    <Edit className="h-4 w-4" /> {t("account.editProfile")}
                  </Button>
                </div>
              )}

              <div className="mt-8 border-t pt-6">
                <h3 className="mb-2 font-heading text-sm font-semibold text-destructive">{t("account.danger")}</h3>
                <p className="mb-4 text-xs text-muted-foreground">{t("account.dangerDesc")}</p>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deletingAccount}>
                      {t("account.deleteAccount")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("account.deleteConfirmTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("account.deleteConfirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("account.cancel")}</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        disabled={deletingAccount}
                        onClick={() => void handleDeleteAccount()}
                      >
                        {deletingAccount ? t("account.deleteLoading") : t("account.deleteAction")}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t("account.prefsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <Label htmlFor="notify-messages" className="text-base font-medium">
                    {t("account.prefsInApp")}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t("account.prefsInAppDesc")}</p>
                </div>
                <Switch
                  id="notify-messages"
                  checked={notifyMessages}
                  onCheckedChange={(v) => setNotifyMessages(v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("account.prefsThemeHint")}</p>
              <Button
                className="font-heading font-semibold"
                disabled={savingPrefs || (prefs !== undefined && notifyMessages === prefs.notify_messages)}
                onClick={() => void handleSavePreferences()}
              >
                {savingPrefs ? t("account.prefsSaving") : t("account.prefsSave")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings">
          {user.role !== "admin" ? null : listingsLoading ? (
            <p className="py-12 text-center text-muted-foreground">{t("common.loading")}</p>
          ) : myListings && myListings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {myListings.map((listing) => (
                <div key={listing.id} className="relative">
                  <ListingCard listing={listing} />
                  <Link
                    to={`/annonces/${listing.id}/modifier`}
                    className="absolute left-2 top-2 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                    title={t("account.editListingTitle")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteListing(listing.id)}
                    className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md hover:bg-destructive/90 transition-colors"
                    title={t("account.deleteListingTitle")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed p-12 text-center">
              <p className="text-muted-foreground">{t("account.emptyListings")}</p>
              <Link to="/annonces/nouvelle">
                <Button className="mt-4 font-heading font-semibold">{t("account.publish")}</Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyAccount;
