"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { SearchFilter } from "@/components/shared/search-filter";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Ticket,
  MapPin,
} from "lucide-react";

type Event = {
  id: string;
  title: string;
  description?: string | null;
  eventType: string;
  status: string;
  location?: string | null;
  isOnline: boolean;
  startDate: string;
  endDate?: string | null;
  capacity?: number | null;
  registrations?: { id: string; status: string }[];
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  UPCOMING: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  ONGOING: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  COMPLETED: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  CANCELLED: "bg-red-400/15 text-red-400 ring-red-400/30",
};

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    eventType: "",
    startDate: "",
    location: "",
    description: "",
    isOnline: false,
    capacity: "",
  });

  const eventsQuery = trpc.event.list.useQuery({});
  const utils = trpc.useUtils();
  const createEvent = trpc.event.create.useMutation({
    onSuccess: () => {
      utils.event.list.invalidate();
      setCreateOpen(false);
      setCreateForm({ title: "", eventType: "", startDate: "", location: "", description: "", isOnline: false, capacity: "" });
    },
  });

  const allEvents = (eventsQuery.data ?? []) as unknown as Event[];

  const now = new Date();
  const upcomingEvents = allEvents.filter((e) => new Date(e.startDate) > now && e.status !== "CANCELLED");
  const ongoingEvents = allEvents.filter((e) => {
    const start = new Date(e.startDate);
    const end = e.endDate ? new Date(e.endDate) : null;
    return start <= now && (!end || end >= now) && e.status !== "CANCELLED";
  });
  const pastEvents = allEvents.filter((e) => {
    const end = e.endDate ? new Date(e.endDate) : new Date(e.startDate);
    return end < now;
  });
  const draftEvents = allEvents.filter((e) => e.status === "DRAFT");

  const tabFiltered =
    activeTab === "upcoming"
      ? upcomingEvents
      : activeTab === "ongoing"
        ? ongoingEvents
        : activeTab === "past"
          ? pastEvents
          : activeTab === "draft"
            ? draftEvents
            : allEvents;

  const filtered = tabFiltered.filter(
    (e) => !search || e.title.toLowerCase().includes(search.toLowerCase()),
  );

  const totalRegistrations = allEvents.reduce(
    (sum, e) => sum + (e.registrations?.length ?? 0),
    0,
  );

  const tabs = [
    { key: "upcoming", label: "A venir", count: upcomingEvents.length },
    { key: "ongoing", label: "En cours", count: ongoingEvents.length },
    { key: "past", label: "Passes", count: pastEvents.length },
    { key: "draft", label: "Brouillons", count: draftEvents.length },
  ];

  if (eventsQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evenements"
        description="Gestion des evenements, inscriptions et participations"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Arene" },
          { label: "Evenements" },
        ]}
      >
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" /> Nouvel evenement
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Evenements a venir" value={upcomingEvents.length} icon={CalendarDays} />
        <StatCard title="Inscriptions totales" value={totalRegistrations} icon={Users} />
        <StatCard title="En cours" value={ongoingEvents.length} icon={Clock} />
        <StatCard title="Termines" value={pastEvents.length} icon={CheckCircle} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search */}
      <SearchFilter
        placeholder="Rechercher un evenement..."
        value={search}
        onChange={setSearch}
      />

      {/* Event list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Aucun evenement"
          description="Creez un evenement pour commencer a gerer les inscriptions et participations."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const statusColors = STATUS_COLORS[e.status] ?? "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30";
            return (
              <div
                key={e.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">{e.title}</h4>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColors}`}
                      >
                        {e.status}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                        {e.eventType}
                      </span>
                    </div>
                    {e.description && (
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-1">{e.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(e.startDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {e.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {e.location}
                        </span>
                      )}
                      {e.isOnline && (
                        <span className="text-blue-400">En ligne</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white">
                      {e.registrations?.length ?? 0}
                    </span>
                    <span className="text-xs text-zinc-500"> inscrits</span>
                    {e.capacity && (
                      <span className="text-xs text-zinc-500"> / {e.capacity}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvel evenement"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!createForm.title || !createForm.eventType || !createForm.startDate) return;
            createEvent.mutate({
              title: createForm.title,
              eventType: createForm.eventType,
              startDate: new Date(createForm.startDate),
              ...(createForm.description ? { description: createForm.description } : {}),
              ...(createForm.location ? { location: createForm.location } : {}),
              isOnline: createForm.isOnline,
              ...(createForm.capacity ? { capacity: Number(createForm.capacity) } : {}),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Titre
            </label>
            <input
              type="text"
              value={createForm.title}
              onChange={(ev) => setCreateForm((p) => ({ ...p, title: ev.target.value }))}
              placeholder="Ex: Workshop branding Q2"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Type
            </label>
            <select
              value={createForm.eventType}
              onChange={(ev) => setCreateForm((p) => ({ ...p, eventType: ev.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            >
              <option value="">Selectionner un type...</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="MEETUP">Meetup</option>
              <option value="CONFERENCE">Conference</option>
              <option value="WEBINAR">Webinaire</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Date de debut
            </label>
            <input
              type="datetime-local"
              value={createForm.startDate}
              onChange={(ev) => setCreateForm((p) => ({ ...p, startDate: ev.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Lieu (optionnel)
            </label>
            <input
              type="text"
              value={createForm.location}
              onChange={(ev) => setCreateForm((p) => ({ ...p, location: ev.target.value }))}
              placeholder="Ex: Douala, Cameroun"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isOnline"
              checked={createForm.isOnline}
              onChange={(ev) => setCreateForm((p) => ({ ...p, isOnline: ev.target.checked }))}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-white"
            />
            <label htmlFor="isOnline" className="text-sm text-zinc-300">
              Evenement en ligne
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Capacite (optionnel)
            </label>
            <input
              type="number"
              value={createForm.capacity}
              onChange={(ev) => setCreateForm((p) => ({ ...p, capacity: ev.target.value }))}
              placeholder="Ex: 50"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Description (optionnel)
            </label>
            <textarea
              value={createForm.description}
              onChange={(ev) => setCreateForm((p) => ({ ...p, description: ev.target.value }))}
              placeholder="Description de l'evenement..."
              rows={2}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {createEvent.error && (
            <p className="text-sm text-red-400">{createEvent.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {createEvent.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
