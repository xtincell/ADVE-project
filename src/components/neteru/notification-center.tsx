"use client";

/**
 * NotificationCenter — dropdown UI (ADR-0024).
 *
 * Affiche les 10 dernières notifications avec filtres + actions.
 * Variants priority via CVA (DS Tier 3 Domain tokens --priority-*).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { trpc } from "@/lib/trpc/client";

const priorityRow = cva(
  "px-3 py-2 border-l-4 hover:bg-[var(--color-surface-hover)] transition-colors",
  {
    variants: {
      priority: {
        LOW: "border-[var(--priority-low,var(--color-border-muted))]",
        NORMAL: "border-[var(--priority-normal,var(--color-border))]",
        HIGH: "border-[var(--priority-high,var(--color-warning))]",
        CRITICAL:
          "border-[var(--priority-critical,var(--color-accent))] bg-[var(--color-accent-subtle)]",
      },
      isRead: {
        true: "opacity-60",
        false: "",
      },
    },
    defaultVariants: { priority: "NORMAL", isRead: false },
  },
);

type Filter = "ALL" | "UNREAD" | "MENTION" | "SYSTEM";

interface Props {
  onClose: () => void;
}

export function NotificationCenter({ onClose }: Props) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const utils = trpc.useUtils();
  const list = trpc.notification.list.useQuery(
    filter === "UNREAD" ? { isRead: false } : {},
  );
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const items = useMemo(() => {
    const data = list.data ?? [];
    if (filter === "MENTION") return data.filter((n) => n.type === "MENTION");
    if (filter === "SYSTEM") return data.filter((n) => n.type === "SYSTEM");
    return data;
  }, [list.data, filter]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => markAllRead.mutate()}
          >
            Tout marquer lu
          </button>
          <button
            type="button"
            aria-label="Fermer"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-3 py-1 border-b border-[var(--color-border)] text-xs">
        {(["ALL", "UNREAD", "MENTION", "SYSTEM"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`px-2 py-1 rounded ${
              filter === f
                ? "bg-[var(--color-surface-active)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "Tous" : f === "UNREAD" ? "Non lus" : f === "MENTION" ? "Mentions" : "Système"}
          </button>
        ))}
      </div>

      <ul className="max-h-96 overflow-y-auto divide-y divide-[var(--color-border-muted)]">
        {list.isLoading && (
          <li className="px-3 py-4 text-sm text-[var(--color-text-muted)]">Chargement…</li>
        )}
        {!list.isLoading && items.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
            Aucune notification.
          </li>
        )}
        {items.slice(0, 10).map((n) => (
          <NotificationRow
            key={n.id}
            id={n.id}
            type={n.type}
            priority={n.priority as VariantProps<typeof priorityRow>["priority"]}
            title={n.title}
            body={n.body}
            link={n.link}
            isRead={n.isRead}
            createdAt={n.createdAt}
            onMarkRead={() => markRead.mutate({ id: n.id })}
          />
        ))}
      </ul>

      <div className="px-3 py-2 border-t border-[var(--color-border)] text-xs">
        <Link
          href="/console/anubis/notifications"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          onClick={onClose}
        >
          Préférences →
        </Link>
      </div>
    </div>
  );
}

interface RowProps {
  id: string;
  type: string;
  priority: VariantProps<typeof priorityRow>["priority"];
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date | string;
  onMarkRead: () => void;
}

function NotificationRow({
  type, priority, title, body, link, isRead, createdAt, onMarkRead,
}: RowProps) {
  const date = new Date(createdAt);
  const inner = (
    <div className={priorityRow({ priority, isRead })}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{body}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            {date.toLocaleString()} · {type}
          </p>
        </div>
        {!isRead && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkRead();
            }}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ✓
          </button>
        )}
      </div>
    </div>
  );

  return link ? <li><Link href={link}>{inner}</Link></li> : <li>{inner}</li>;
}
