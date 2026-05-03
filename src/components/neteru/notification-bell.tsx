"use client";

/**
 * NotificationBell — header badge + dropdown center (ADR-0025).
 *
 * Branche EventSource sur /api/notifications/stream pour real-time push,
 * fallback poll toutes les 60s si SSE close. Click ouvre NotificationCenter.
 *
 * DS conformity (CLAUDE.md §Design System) :
 *   - Aucun token Reference direct.
 *   - Variants priority via CVA dans NotificationCenter.
 */

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { NotificationCenter } from "./notification-center";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const unread = trpc.notification.unreadCount.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const es = new EventSource("/api/notifications/stream");
    esRef.current = es;

    es.addEventListener("notification", () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    });

    es.onerror = () => {
      // Auto-retry handled by browser. We just stop the source if a permanent
      // error occurs (server unreachable). A reload will re-open.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [utils]);

  const count = unread.data?.count ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${count > 0 ? ` (${count} non lues)` : ""}`}
        className="relative inline-flex items-center justify-center rounded-md p-2 hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[0.625rem] font-semibold text-[var(--color-on-accent)]"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 z-50">
          <NotificationCenter onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
