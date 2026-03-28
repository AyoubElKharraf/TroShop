import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ConversationRow, MessageRow } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Store, MessageCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/use-toast";

const Messages = () => {
  const { t } = useTranslation();
  usePageTitle(t("titles.messages"));
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [openingAdmin, setOpeningAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationsInvalidatedRef = useRef<string | null>(null);

  const { data: conversations, isError: convError, error: convErr, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => api<ConversationRow[]>("/api/conversations"),
  });

  const activeConv = useMemo(
    () => conversations?.find((c) => c.id === conversationId),
    [conversations, conversationId]
  );

  const { data: msgs, isError: msgsError, error: msgsErr, refetch: refetchMsgs } = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    refetchInterval: conversationId ? (query) => (query.state.error ? false : 2500) : false,
    queryFn: async () =>
      api<MessageRow[]>(`/api/conversations/${conversationId!}/messages`),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    conversationsInvalidatedRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || msgs === undefined) return;
    if (conversationsInvalidatedRef.current === conversationId) return;
    conversationsInvalidatedRef.current = conversationId;
    void queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
  }, [conversationId, msgs, queryClient, user?.id]);

  const handleOpenWithAdmin = async () => {
    setOpeningAdmin(true);
    try {
      const { id } = await api<{ id: string }>("/api/conversations/open-with-admin", {
        method: "POST",
      });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate(`/messages/${id}`);
      toast({
        title: t("messages.openOkTitle"),
        description: t("messages.openOkDesc"),
      });
    } catch (err: unknown) {
      toast({
        title: t("messages.openFailTitle"),
        description: err instanceof Error ? err.message : t("messages.openFailDesc"),
        variant: "destructive",
      });
    } finally {
      setOpeningAdmin(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || !user) return;
    setSending(true);
    try {
      await api(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: message.trim() }),
      });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err: unknown) {
      toast({
        title: t("messages.sendFailTitle"),
        description: err instanceof Error ? err.message : t("messages.sendFailDesc"),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return <div className="container py-12 text-center">{t("messages.loginPrompt")}</div>;
  }

  const isAdmin = user.role === "admin";

  const convTitle = (c: ConversationRow) => {
    const peer = c.peer_display_name?.trim();
    if (isAdmin) {
      return peer || t("messages.fallbackClient");
    }
    return peer || c.listings?.title || t("messages.chat");
  };

  const convSubtitle = (c: ConversationRow) => {
    if (isAdmin) {
      if (c.peer_email) return c.peer_email;
      return c.is_contact_hub ? t("messages.generalThread") : c.listings?.title || "";
    }
    return c.is_contact_hub ? t("messages.generalThread") : c.listings?.title || "";
  };

  const threadBadge = (c: ConversationRow) => {
    const s = c.thread_status;
    if (c.unread) {
      return (
        <Badge className="mt-0.5 shrink-0 text-[10px]" variant="default">
          {t("messages.threadStatus.unread")}
        </Badge>
      );
    }
    if (s === "needs_reply") {
      return (
        <Badge className="mt-0.5 shrink-0 text-[10px]" variant="secondary">
          {t("messages.threadStatus.needsReply")}
        </Badge>
      );
    }
    if (s === "waiting") {
      return (
        <Badge className="mt-0.5 shrink-0 text-[10px]" variant="outline">
          {t("messages.threadStatus.waiting")}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="container flex h-[calc(100vh-4rem)] gap-0 overflow-hidden py-0 md:gap-4 md:py-4">
      <div className={`w-full shrink-0 border-r md:w-96 ${conversationId ? "hidden md:block" : ""}`}>
        <h2 className="border-b p-4 font-heading text-lg font-bold">
          {isAdmin ? t("messages.sidebarTitleAdmin") : t("messages.sidebarTitleUser")}
        </h2>

        {!isAdmin && (
          <div className="border-b p-3">
            <Button
              type="button"
              className="h-auto w-full justify-start gap-3 py-3 text-left font-heading font-semibold"
              variant="secondary"
              onClick={() => void handleOpenWithAdmin()}
              disabled={openingAdmin}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">{t("messages.writeShop")}</p>
                <p className="text-xs font-normal text-muted-foreground">{t("messages.writeShopHint")}</p>
              </div>
            </Button>
          </div>
        )}

        <div className="overflow-y-auto">
          {convError && (
            <div className="border-b p-4 text-sm">
              <p className="text-destructive">{t("messages.loadConversationsError")}</p>
              <p className="mt-1 text-muted-foreground">
                {convErr instanceof Error ? convErr.message : String(convErr)}
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void refetchConversations()}>
                {t("common.retry")}
              </Button>
            </div>
          )}
          {conversations?.map((conv) => (
            <Link
              key={conv.id}
              to={`/messages/${conv.id}`}
              className={`flex items-center gap-3 border-b p-4 transition-colors hover:bg-muted ${conv.id === conversationId ? "bg-muted" : ""}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {conv.listings?.images?.[0] ? (
                  <img src={conv.listings.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-heading text-sm font-bold">{convTitle(conv)}</p>
                  {threadBadge(conv)}
                </div>
                <p className="truncate text-xs text-muted-foreground">{convSubtitle(conv)}</p>
                {conv.last_message_preview && (
                  <p className="line-clamp-2 text-[11px] text-muted-foreground/90">{conv.last_message_preview}</p>
                )}
                <p className="text-[10px] text-muted-foreground/80">
                  {new Date(conv.updated_at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </Link>
          ))}
          {conversations?.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              {isAdmin ? t("messages.emptyAdmin") : t("messages.emptyUser")}
            </p>
          )}
        </div>
      </div>

      {conversationId ? (
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-0.5 border-b p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Link to="/messages" className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <span className="font-heading text-sm font-bold">
                  {activeConv ? convTitle(activeConv) : t("messages.chat")}
                </span>
                {activeConv && (
                  <p className="text-xs text-muted-foreground">
                    {isAdmin && activeConv.peer_email
                      ? activeConv.peer_email
                      : convSubtitle(activeConv)}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgsError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">{t("messages.loadMessagesError")}</p>
                <p className="mt-1 text-muted-foreground">
                  {msgsErr instanceof Error ? msgsErr.message : String(msgsErr)}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void refetchMsgs()}>
                  {t("common.retry")}
                </Button>
              </div>
            )}
            {msgs?.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isAdmin ? t("messages.placeholderAdmin") : t("messages.placeholderUser")}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center gap-2 md:flex">
          <p className="text-muted-foreground">
            {isAdmin ? t("messages.selectAdmin") : t("messages.selectUser")}
          </p>
        </div>
      )}
    </div>
  );
};

export default Messages;
