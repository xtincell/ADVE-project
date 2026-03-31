"use client";

import { useRef, useEffect } from "react";
import { MessageSquare, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelBadge } from "./conversation-list";

export interface MessageItem {
  id: string;
  senderId: string | null;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  channel: string;
  readAt: string | Date | null;
  createdAt: string | Date;
}

// ── Date grouping ───────────────────────────────────────────────────────
function formatDateGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Group messages by date ──────────────────────────────────────────────
function groupByDate(messages: MessageItem[]) {
  const groups: { label: string; messages: MessageItem[] }[] = [];
  let currentLabel = "";

  for (const msg of messages) {
    const label = formatDateGroup(new Date(msg.createdAt));
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [] });
    }
    groups[groups.length - 1]!.messages.push(msg);
  }

  return groups;
}

interface MessageThreadProps {
  messages: MessageItem[];
  currentUserId: string;
  isLoading?: boolean;
}

export function MessageThread({
  messages,
  currentUserId,
  isLoading,
}: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-500" />
          <p className="mt-3 text-sm text-zinc-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-500">
            Aucun message pour le moment
          </p>
        </div>
      </div>
    );
  }

  const groups = groupByDate(messages);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          {/* Date separator */}
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-medium text-zinc-600">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Messages for this date */}
          <div className="space-y-3">
            {group.messages.map((msg) => {
              const isSelf = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    isSelf ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5",
                      isSelf
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-200",
                    )}
                  >
                    {!isSelf && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <p className="text-[10px] font-medium text-zinc-400">
                          {msg.senderName}
                        </p>
                        {msg.channel !== "INTERNAL" && (
                          <ChannelBadge channel={msg.channel} />
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {msg.content}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      {isSelf && msg.channel !== "INTERNAL" && (
                        <ChannelBadge channel={msg.channel} />
                      )}
                      <span
                        className={cn(
                          "text-[10px]",
                          isSelf ? "text-violet-300" : "text-zinc-600",
                        )}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                      {isSelf &&
                        (msg.readAt ? (
                          <CheckCheck className="h-3 w-3 text-violet-300" />
                        ) : (
                          <Check className="h-3 w-3 text-violet-300" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
