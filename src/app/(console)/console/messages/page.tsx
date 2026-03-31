"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Tabs } from "@/components/shared/tabs";
import { Modal } from "@/components/shared/modal";
import {
  MessageSquare,
  Inbox,
  Send,
  Archive,
  Plus,
  Mail,
} from "lucide-react";

const CHANNEL_COLORS: Record<string, string> = {
  INTERNAL: "bg-blue-400/15 text-blue-400",
  INSTAGRAM: "bg-pink-400/15 text-pink-400",
  FACEBOOK: "bg-indigo-400/15 text-indigo-400",
  WHATSAPP: "bg-green-400/15 text-green-400",
  TELEGRAM: "bg-cyan-400/15 text-cyan-400",
  DISCORD: "bg-violet-400/15 text-violet-400",
};

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { data: conversations, isLoading } = trpc.messaging.listConversations.useQuery({});
  const { data: unreadCount } = trpc.messaging.getUnreadCount.useQuery();
  const { data: conversationDetail } = trpc.messaging.getConversation.useQuery(
    { conversationId: selectedConversationId ?? "" },
    { enabled: !!selectedConversationId },
  );

  const utils = trpc.useUtils();

  const allConversations = conversations ?? [];
  const activeConversations = allConversations.filter((c) => c.status === "ACTIVE");
  const archivedConversations = allConversations.filter((c) => c.status === "ARCHIVED");
  const totalUnread = unreadCount ?? 0;

  const tabs = [
    { key: "inbox", label: "Boite de reception", count: activeConversations.length },
    { key: "archived", label: "Archives", count: archivedConversations.length },
  ];

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Messagerie interne de la console LaFusee"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Messages" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Nouveau message
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Non lus"
          value={totalUnread}
          icon={Mail}
          trend={totalUnread > 0 ? "up" : "flat"}
          trendValue={totalUnread > 0 ? `${totalUnread} a lire` : "A jour"}
        />
        <StatCard title="Conversations actives" value={activeConversations.length} icon={Inbox} />
        <StatCard title="Messages totaux" value={allConversations.reduce((sum, c) => sum + (c._count?.messages ?? 0), 0)} icon={Send} />
        <StatCard title="Archives" value={archivedConversations.length} icon={Archive} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Conversation list */}
      {activeTab === "inbox" && (
        <>
          {activeConversations.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Aucun message"
              description="Votre boite de reception est vide. Les messages de l'equipe et des clients apparaitront ici."
            />
          ) : (
            <div className="space-y-2">
              {activeConversations.map((conv) => {
                const participants = conv.participants as Array<{ name: string }> | null;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{conv.title}</p>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <span className="shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="mt-0.5 text-xs text-zinc-500 truncate">{conv.lastMessage}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CHANNEL_COLORS[conv.channel ?? "INTERNAL"] ?? CHANNEL_COLORS.INTERNAL}`}>
                          {conv.channel ?? "INTERNAL"}
                        </span>
                        {participants && participants.length > 0 && (
                          <span className="text-[10px] text-zinc-600">
                            {participants.map((p) => p.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right ml-4">
                      <p className="text-[10px] text-zinc-600">
                        {conv.lastMessageAt
                          ? new Date(conv.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </p>
                      <p className="text-[10px] text-zinc-600">{conv._count?.messages ?? 0} msg</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
      {activeTab === "archived" && (
        <EmptyState
          icon={Archive}
          title="Aucune archive"
          description="Les messages archives seront affiches ici."
        />
      )}

      {/* Conversation Detail Modal */}
      <Modal
        open={!!selectedConversationId}
        onClose={() => setSelectedConversationId(null)}
        title={conversationDetail?.title ?? "Conversation"}
        size="lg"
      >
        {conversationDetail && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conversationDetail.messages.map((msg) => (
              <div key={msg.id} className="rounded-lg bg-zinc-800/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-300">{msg.senderName}</span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(msg.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{msg.content}</p>
              </div>
            ))}
            {conversationDetail.messages.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">Aucun message dans cette conversation.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
