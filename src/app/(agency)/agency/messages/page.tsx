"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { MessageSquare, Mail, Archive, Bell } from "lucide-react";

export default function AgencyMessagesPage() {
  const { data: conversations, isLoading } = trpc.messaging.listConversations.useQuery({});
  const { data: unreadData } = trpc.messaging.getUnreadCount.useQuery();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const { data: selectedConv } = trpc.messaging.getConversation.useQuery(
    { conversationId: selectedConvId ?? "" },
    { enabled: !!selectedConvId },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Messages" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Messages" }]} />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  const items = (conversations ?? []) as Array<Record<string, unknown>>;
  const unreadCount = (unreadData as number) ?? 0;
  const activeConvs = items.filter((c) => c.status === "ACTIVE" || c.status === "OPEN").length;
  const archivedConvs = items.filter((c) => c.status === "ARCHIVED" || c.status === "CLOSED").length;
  const totalMessages = items.reduce((sum, c) => {
    const count = c._count as Record<string, number> | null;
    return sum + (count?.messages ?? 0);
  }, 0);

  const conv = selectedConv as Record<string, unknown> | null;
  const messages = conv ? (conv.messages as Array<Record<string, unknown>> ?? []) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description={`${items.length} conversations`}
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Messages" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Non lus" value={unreadCount} icon={Bell} trend={unreadCount > 0 ? "up" : undefined} />
        <StatCard title="Actives" value={activeConvs} icon={MessageSquare} />
        <StatCard title="Total messages" value={totalMessages} icon={Mail} />
        <StatCard title="Archivees" value={archivedConvs} icon={Archive} />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucun message" description="Les conversations apparaitront ici." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Conversation list */}
          <div className="space-y-2 lg:col-span-1">
            {items.map((c) => {
              const isActive = selectedConvId === String(c.id);
              const unread = Number(c.unreadCount) || 0;
              return (
                <button
                  key={String(c.id)}
                  onClick={() => setSelectedConvId(String(c.id))}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    isActive ? "border-accent/50 bg-accent/10" : "border-border bg-background/80 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{String(c.title ?? "Sans titre")}</p>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted truncate">{String(c.lastMessage ?? "")}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={String(c.channel ?? "-")} />
                    <span className="text-[10px] text-foreground-muted">
                      {c.lastMessageAt ? new Date(c.lastMessageAt as string).toLocaleDateString("fr-FR") : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Message thread */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-background/50 p-4">
            {!selectedConvId ? (
              <div className="flex h-64 items-center justify-center text-sm text-foreground-muted">
                Selectionnez une conversation
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-foreground-muted">
                Aucun message dans cette conversation
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {messages.map((msg) => (
                  <div key={String(msg.id)} className="rounded-lg bg-background/80 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-accent">{String(msg.senderName ?? "Inconnu")}</p>
                      <span className="text-[10px] text-foreground-muted">
                        {msg.createdAt ? new Date(msg.createdAt as string).toLocaleString("fr-FR") : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground-secondary">{String(msg.content ?? "")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
