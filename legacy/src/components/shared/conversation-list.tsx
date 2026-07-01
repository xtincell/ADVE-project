"use client";

import { useState } from "react";
import {
  Search,
  MessageSquare,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Channel config ──────────────────────────────────────────────────────
const CHANNEL_TABS = [
  { key: "ALL", label: "Tous" },
  { key: "INTERNAL", label: "Interne" },
  { key: "INSTAGRAM", label: "IG" },
  { key: "FACEBOOK", label: "FB" },
  { key: "WHATSAPP", label: "WA" },
  { key: "TELEGRAM", label: "TG" },
  { key: "DISCORD", label: "DC" },
] as const;

const CHANNEL_COLORS: Record<string, string> = {
  INTERNAL: "bg-surface-elevated",
  INSTAGRAM: "bg-gradient-to-br from-purple-500 to-pink-500",
  FACEBOOK: "bg-blue-600",
  WHATSAPP: "bg-green-500",
  TELEGRAM: "bg-sky-500",
  DISCORD: "bg-indigo-500",
};

const CHANNEL_LABELS: Record<string, string> = {
  INTERNAL: "",
  INSTAGRAM: "IG",
  FACEBOOK: "FB",
  WHATSAPP: "WA",
  TELEGRAM: "TG",
  DISCORD: "DC",
};

export interface ConversationItem {
  id: string;
  title: string | null;
  channel: string;
  lastMessage: string | null;
  lastMessageAt: string | Date | null;
  unreadCount: number;
  participants: Array<{ userId: string; name: string; role?: string }> | unknown;
  _count?: { messages: number };
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "INTERNAL") {
    return <MessageSquare className="h-4 w-4 text-foreground-secondary" />;
  }
  const label = CHANNEL_LABELS[channel] ?? channel.slice(0, 2);
  const bgClass = CHANNEL_COLORS[channel] ?? "bg-surface-elevated";
  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white",
        bgClass,
      )}
    >
      {label}
    </span>
  );
}

function formatTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `${diffDays}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

interface ConversationListProps {
  conversations: ConversationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      !search ||
      (c.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.lastMessage ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesChannel =
      channelFilter === "ALL" || c.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  return (
    <div className="flex h-full flex-col border-r border-border bg-background/80">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
          />
        </div>
      </div>

      {/* Channel filter tabs */}
      <div className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5">
        {CHANNEL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setChannelFilter(tab.key)}
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              channelFilter === tab.key
                ? "bg-surface-raised text-white"
                : "text-foreground-muted hover:bg-background hover:text-foreground-secondary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-background" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-background" />
                  <div className="h-2 w-40 animate-pulse rounded bg-background" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-foreground-muted">
            Aucune conversation trouvee
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors",
                selectedId === conv.id
                  ? "bg-background/60"
                  : "hover:bg-background/30",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
                {conv.channel === "INTERNAL" ? (
                  <Users className="h-4 w-4 text-foreground-secondary" />
                ) : (
                  <ChannelBadge channel={conv.channel} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-sm",
                      conv.unreadCount > 0
                        ? "font-semibold text-white"
                        : "font-medium text-foreground-secondary",
                    )}
                  >
                    {conv.title ?? "Sans titre"}
                  </p>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-foreground-muted">
                    {conv.channel !== "INTERNAL" && (
                      <ChannelBadge channel={conv.channel} />
                    )}
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs text-foreground-muted">
                    {conv.lastMessage ?? "Pas de message"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="ml-2 flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export { ChannelBadge, CHANNEL_COLORS, CHANNEL_LABELS };
