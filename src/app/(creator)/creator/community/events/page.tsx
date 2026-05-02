"use client";

import { useState } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Video,
  CheckCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilter } from "@/components/shared/search-filter";
import { Tabs } from "@/components/shared/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const eventsQuery = trpc.event.list.useQuery({});
  const utils = trpc.useUtils();

  const registerMutation = trpc.event.register.useMutation({
    onSuccess: () => utils.event.list.invalidate(),
  });
  const unregisterMutation = trpc.event.unregister.useMutation({
    onSuccess: () => utils.event.list.invalidate(),
  });

  if (eventsQuery.isLoading) return <SkeletonPage />;

  const events = eventsQuery.data ?? [];

  const filtered = events.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const isOnline = e.isOnline ?? false;
    const matchTab =
      tab === "all" ||
      (tab === "presentiel" && !isOnline) ||
      (tab === "virtuel" && isOnline);
    return matchSearch && matchTab;
  });

  const presCount = events.filter((e) => !e.isOnline).length;
  const virtCount = events.filter((e) => e.isOnline).length;

  const tabs = [
    { key: "all", label: "Tous", count: events.length },
    { key: "presentiel", label: "Presentiel", count: presCount },
    { key: "virtuel", label: "Virtuel", count: virtCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evenements"
        description="Rencontres, formations et webinaires de la communaute"
        breadcrumbs={[
          { label: "Dashboard", href: "/creator" },
          { label: "Communaute" },
          { label: "Evenements" },
        ]}
      />

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      <SearchFilter
        placeholder="Rechercher un evenement..."
        value={search}
        onChange={setSearch}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucun evenement"
          description="Les evenements de la communaute apparaitront ici."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((event) => {
            const regCount = event.registrations?.filter((r) => r.status !== "CANCELLED").length ?? 0;
            const capacity = event.capacity ?? 999;
            const isFull = regCount >= capacity;
            const spotsLeft = capacity - regCount;
            const eventDate = new Date(event.startDate);
            const isPast = eventDate < new Date();
            const isOnline = event.isOnline ?? false;
            // Check if current user is registered (optimistic — registrations include all)
            const isRegistered = event.registrations?.some((r) => r.status !== "CANCELLED") ?? false;

            return (
              <div
                key={event.id}
                className={`rounded-xl border bg-background/80 p-5 transition-colors ${
                  isPast ? "border-border/50 opacity-60" : "border-border hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    {/* Date badge */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-background">
                      <span className="text-lg font-bold text-white">
                        {eventDate.getDate()}
                      </span>
                      <span className="text-[10px] uppercase text-foreground-muted">
                        {eventDate.toLocaleDateString("fr-FR", { month: "short" })}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white">{event.title}</h3>
                      {event.description && (
                        <p className="mt-1 text-xs text-foreground-muted line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-foreground-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1">
                          {isOnline ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {event.location ?? (isOnline ? "En ligne" : "A definir")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {regCount}/{capacity}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isOnline
                              ? "bg-blue-400/15 text-blue-400"
                              : "bg-success/15 text-success"
                          }`}
                        >
                          {isOnline ? "En ligne" : "Presentiel"}
                        </span>
                        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground-muted">
                          {event.eventType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Register button */}
                  <div className="shrink-0">
                    {isPast ? (
                      <span className="text-xs text-foreground-muted">Termine</span>
                    ) : isRegistered ? (
                      <button
                        disabled={unregisterMutation.isPending}
                        onClick={() => unregisterMutation.mutate({ eventId: event.id })}
                        className="flex items-center gap-1.5 rounded-lg bg-success/15 px-4 py-2 text-xs font-medium text-success transition-colors hover:bg-success/25 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Inscrit
                      </button>
                    ) : isFull ? (
                      <span className="rounded-lg bg-background px-4 py-2 text-xs font-medium text-foreground-muted">
                        Complet
                      </span>
                    ) : (
                      <button
                        disabled={registerMutation.isPending}
                        onClick={() => registerMutation.mutate({ eventId: event.id })}
                        className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-foreground disabled:opacity-50"
                      >
                        {registerMutation.isPending ? "..." : "S\u0027inscrire"}
                      </button>
                    )}

                    {!isPast && !isFull && spotsLeft <= 5 && (
                      <p className="mt-1 text-center text-[10px] text-warning">
                        {spotsLeft} place(s)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
