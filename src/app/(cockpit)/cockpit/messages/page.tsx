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
  Plus,
} from "lucide-react";
import { ChannelBadge } from "@/components/shared/conversation-list";

export default function CockpitMessagesPage() {
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
    // Mark as read when selecting
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
            ? `${totalUnread} message(s) non lu(s) - Inbox unifie multi-canal`
            : "Inbox unifie - Messages internes et canaux externes"
        }
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Messages" },
        ]}
      />

      {/* Empty state */}
      {!conversationsQuery.isLoading && !hasConversations && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
          <div>
            <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-300">Aucune conversation</p>
            <p className="mt-1 text-xs text-zinc-500">
              Les conversations apparaitront ici lorsque des missions seront lancees ou que des echanges seront inities.
            </p>
          </div>
        </div>
      )}

      {/* Main messaging layout */}
      <div
        className="grid grid-cols-1 overflow-hidden rounded-xl border border-zinc-800 lg:grid-cols-3"
        style={{ height: "calc(100vh - 260px)", minHeight: 500 }}
      >
        {/* Left: Conversation list */}
        <div className="border-b border-zinc-800 lg:border-b-0">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConvId}
            onSelect={handleSelectConversation}
            isLoading={conversationsQuery.isLoading}
          />
        </div>

        {/* Right: Message thread */}
        <div className="col-span-2 flex flex-col bg-zinc-950/50">
          {!selectedConvId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-zinc-700" />
                <p className="mt-3 text-sm text-zinc-500">
                  Selectionnez une conversation
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Tous vos canaux dans un seul endroit
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
                  {selectedConv?.channel === "INTERNAL" ? (
                    <Users className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChannelBadge channel={selectedConv?.channel ?? "INTERNAL"} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {selectedConv?.title ?? "Conversation"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {selectedConv?.channel !== "INTERNAL"
                      ? `Canal: ${selectedConv?.channel}`
                      : "Message interne"}
                    {" "}
                    {conversationDetailQuery.data?.messages
                      ? `- ${conversationDetailQuery.data.messages.length} messages`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Messages thread */}
              <MessageThread
                messages={messages}
                currentUserId={currentUserId}
                isLoading={conversationDetailQuery.isLoading}
              />

              {/* Input */}
              <div className="border-t border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ecrivez un message..."
                      rows={1}
                      className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
                      style={{ minHeight: 38, maxHeight: 120 }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMutation.isPending}
                    className="shrink-0 rounded-lg bg-violet-600 p-2 text-white transition-colors hover:bg-violet-700 disabled:opacity-30 disabled:hover:bg-violet-600"
                  >
                    <Send className="h-5 w-5" />
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
