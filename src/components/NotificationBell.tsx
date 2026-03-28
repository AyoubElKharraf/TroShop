import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "@/components/ui/sonner";

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const dateLocale = i18n.language === "en" ? enUS : fr;

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => api<{ count: number }>("/api/notifications/unread-count"),
    /** Rafraîchissement plus fréquent pour refléter vite les nouveaux messages (ex. client + admin connectés) */
    refetchInterval: (query) => (query.state.error ? false : 12_000),
    refetchOnWindowFocus: true,
  });

  const { data: items, isLoading, isError, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => api<AppNotification[]>("/api/notifications?limit=25"),
    enabled: open,
    refetchInterval: (query) => (open && !query.state.error ? 30_000 : false),
  });

  const count = unreadData?.count ?? 0;
  const prevUnreadRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (unreadData === undefined) return;
    const c = unreadData.count ?? 0;
    if (prevUnreadRef.current === undefined) {
      prevUnreadRef.current = c;
      return;
    }
    if (c > prevUnreadRef.current) {
      const delta = c - prevUnreadRef.current;
      sonnerToast.custom(
        () => (
          <div
            role="status"
            className="flex w-[min(100vw-2rem,28rem)] items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bell className="h-5 w-5" aria-hidden />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {c > 99 ? "99+" : c}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold leading-tight">{t("notifications.newBannerTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("notifications.newBannerDesc", { delta, total: c })}
              </p>
            </div>
          </div>
        ),
        { duration: 2000 }
      );
    }
    prevUnreadRef.current = c;
  }, [unreadData, t]);

  const markRead = async (id: string) => {
    await api(`/api/notifications/${id}/read`, { method: "PATCH" });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const markAllRead = async () => {
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    } catch (e: unknown) {
      toast({
        title: t("notifications.actionFail"),
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const openNotification = async (n: AppNotification) => {
    try {
      if (!n.read) await markRead(n.id);
    } catch (e: unknown) {
      toast({
        title: t("notifications.actionFail"),
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
    setOpen(false);
    if (n.link_path) navigate(n.link_path);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={
            count > 0 ? t("notifications.ariaWithCount", { count: count > 99 ? "99+" : count }) : t("notifications.aria")
          }
        >
          <Bell className="h-5 w-5 shrink-0" aria-hidden />
          {count > 0 && (
            <span
              className="absolute right-1 top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm"
              aria-hidden
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="font-heading text-sm font-semibold">{t("notifications.title")}</span>
          {items && items.some((n) => !n.read) && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => void markAllRead()}>
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notifications.markAll")}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[min(60vh,320px)]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="px-4 py-6 text-center text-sm">
              <p className="text-destructive">{t("notifications.loadError")}</p>
              <p className="mt-1 text-muted-foreground">
                {error instanceof Error ? error.message : String(error)}
              </p>
            </div>
          ) : !items?.length ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(n)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          n.type === "message" && "bg-primary/15 text-primary",
                          n.type !== "message" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {t(`notifications.typeLabel.${n.type}`, { defaultValue: n.type })}
                      </span>
                      <span className="font-medium">{n.title}</span>
                    </div>
                    {n.body && <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>}
                    <span className="text-[10px] text-muted-foreground/80">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t px-3 py-2">
          <p className="mb-2 text-[11px] leading-snug text-muted-foreground">{t("notifications.disclaimer")}</p>
          <Button variant="link" className="h-auto w-full py-1 text-xs" asChild>
            <Link to="/mon-compte" onClick={() => setOpen(false)}>
              {t("notifications.prefsLink")}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
