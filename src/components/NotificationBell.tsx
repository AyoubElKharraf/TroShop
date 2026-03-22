import { useState } from "react";
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

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dateLocale = i18n.language === "en" ? enUS : fr;

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => api<{ count: number }>("/api/notifications/unread-count"),
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => api<AppNotification[]>("/api/notifications?limit=25"),
    enabled: open,
    refetchInterval: open ? 30_000 : false,
  });

  const count = unreadData?.count ?? 0;

  const markRead = async (id: string) => {
    await api(`/api/notifications/${id}/read`, { method: "PATCH" });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const markAllRead = async () => {
    await api("/api/notifications/read-all", { method: "POST" });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const openNotification = async (n: AppNotification) => {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.link_path) navigate(n.link_path);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("notifications.aria")}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
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
                    <span className="font-medium">{n.title}</span>
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
        <div className="border-t px-2 py-2">
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
