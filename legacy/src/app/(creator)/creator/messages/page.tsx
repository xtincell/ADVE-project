"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ConversationList } from "@/components/shared/conversation-list";
import { MessageThread } from "@/components/shared/message-thread";
import type { ConversationItem } from "@/components/shared/conversation-list";
import type { MessageItem } from "@/components/shared/message-thread";
import { trpc } from "@/lib/trpc/client";
import {
  MessageSquare,
  Send,
  Users,
} from "lucide-react";
import { ChannelBadge } from "@/components/shared/conversation-list";

export default function CreatorMessagesPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // ── Queries ─────────────────────────────────────────────────────────
  const meQuery = trpc.messaging.me.useQuery();
  const conversationsQuery = trpc.messaging.listConversations.useQuery(
    undefined,
    { refetchInterval: 10000 },
  );

  const conversationDetailQuery = trpc.messaging.getConversation.useQuery(
    { conversationId: selectedConvId! },
    { enabled: !!selectedConvId, refetchInterval: 5000 },
  );

  const unreadQuery = trpc.messaging.getUnreadCount.useQuery(undefined, {
    refetchInterval: 15000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────
  const sendMutation = trpc.messaging.sendMessage.useMutation({
    onSuccess: () => {
      setInput("");
      conversationDetailQuery.refetch();
      conversationsQuery.refetch();
    },
  });

  const markReadMutation = trpc.messaging.markAsRead.useMutation({
    onSuccess: () => {
      conversationsQuery.refetch();
      unreadQuery.refetch();
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    const conv = conversationsQuery.data?.find((c) => c.id === id);
    if (conv && conv.unreadCount > 0) {
      markReadMutation.mutate({ conversationId: id });
    }
  };

  const handleSend = () => {
    if (!input.trim() || !selectedConvId) return;
    sendMutation.mutate({
      conversationId: selectedConvId,
      content: input.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────
  const conversations: ConversationItem[] = (conversationsQuery.data ?? []).map(
    (c) => ({
      id: c.id,
      title: c.title,
      channel: c.channel,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c.unreadCount,
      participants: c.participants,
      _count: c._count,
    }),
  );

  const messages: MessageItem[] = (
    conversationDetailQuery.data?.messages ?? []
  ).map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName,
    senderAvatar: m.senderAvatar,
    content: m.content,
    channel: m.channel,
    readAt: m.readAt,
    createdAt: m.createdAt,
  }));

  const selectedConv = conversationsQuery.data?.find(
    (c) => c.id === selectedConvId,
  );

  const currentUserId = meQuery.data?.id ?? "";
  const totalUnread = unreadQuery.data ?? 0;
  const hasConversations = (conversationsQuery.data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description={
          totalUnread > 0
            ? `${totalUnread} message(s) non lu(s)`
            : "Vos conversations avec les equipes et clients"
        }
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Messages" },
        ]}
      />

      {!conversationsQuery.isLoading && !hasConversations && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
          <div>
            <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-300">Aucune conversation</p>
            <p className="mt-1 text-xs text-zinc-500">
              Les conversations apparaitront ici lorsque vous serez assigne a des missions ou contacte par une equipe.
            </p>
          </div>
        </div>
      )}

      {/* Two-panel messaging layout */}
      <div
        className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80"
        style={{ height: "calc(100vh - 260px)", minHeight: 500 }}
      >
        {/* Left sidebar: conversation list */}
        <div className="w-80 shrink-0">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConvId}
            onSelect={handleSelectConversation}
            isLoading={conversationsQuery.isLoading}
          />
        </div>

        {/* Right panel: messages */}
        <div className="flex flex-1 flex-col bg-zinc-950/50">
          {!selectedConvId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-zinc-700" />
                <p className="mt-3 text-sm text-zinc-500">
                  Selectionnez une conversation
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Discutez avec vos clients et l&apos;equipe LaFusee
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
                  {selectedConv?.channel === "INTERNAL" ? (
                    <Users className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChannelBadge channel={selectedConv?.channel ?? "INTERNAL"} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {selectedConv?.title ?? "Conversation"}
                  </h3>
                  <p className="text-[10px] text-zinc-500">
                    {selectedConv?.channel !== "INTERNAL"
                      ? `Canal: ${selectedConv?.channel}`
                      : "Message interne"}
                    {conversationDetailQuery.data?.messages
                      ? ` - ${conversationDetailQuery.data.messages.length} messages`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <MessageThread
                messages={messages}
                currentUserId={currentUserId}
                isLoading={conversationDetailQuery.isLoading}
              />

              {/* Message input */}
              <div className="border-t border-zinc-800 p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ecrire un message..."
                    className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMutation.isPending}
                    className="rounded-lg bg-white p-2.5 text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
