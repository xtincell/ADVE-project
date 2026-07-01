/**
 * /console/operate/africa-portfolio — Phase 18 (ADR-0059) Dashboard agence Afrique.
 *
 * 3 vues pour Matanga Agency (et autres operators) :
 *  1. **Project Tracker** (BACK2SCH-style) — Campaigns en cours par client × master
 *     × statut créa | client × RAG. Filtres par RAG / Cluster / Master Brand.
 *  2. **Checklist Livrables** (RAMADAN-style) — Tableau matrice 6D :
 *     SKU × pays × format × langue × promo × status. Filtres + check ✓ inline.
 *  3. **KPIs Agency** — Header dashboard : compteurs cross-clients, RAG breakdown,
 *     Sentinels alertes, top urgentes.
 *
 * Les data sont scopées par operator (operatorId courant via session) avec
 * filtres optionnels (countryCode IN AFRICA, clusterTag, status, rag).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Activity, AlertTriangle, CheckCircle2, Layers, Package, Ticket, ClipboardList } from "lucide-react";
import { OperatorActionForm } from "@/components/portfolio/OperatorActionForm";

const TABS = ["KPIS", "PROJECTS", "DELIVERABLES", "ACTIONS", "TICKETS"] as const;
type Tab = (typeof TABS)[number];

const RAG_COLORS: Record<string, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-300",
  AMBER: "bg-amber-500/15 text-amber-300",
  RED: "bg-error/15 text-error",
};

export default function AfricaPortfolioPage() {
  const [tab, setTab] = useState<Tab>("KPIS");
  const { data: operator } = trpc.operator.getOwn.useQuery();

  if (!operator) return <div className="p-6 text-sm text-foreground-secondary">Loading…</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Africa Portfolio — {operator.name}</h1>
        <p className="text-sm text-foreground-secondary">
          Dashboard cross-clients : campagnes en vol, livrables matrice 6D, KPIs agrégés Afrique.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-zinc-700">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "border-b-2 border-accent text-foreground"
                : "border-b-2 border-transparent text-foreground-secondary hover:text-foreground"
            }`}
          >
            {t === "KPIS" ? "KPIs Agency"
              : t === "PROJECTS" ? "Projects (Project Tracker)"
              : t === "DELIVERABLES" ? "Deliverables (Checklist)"
              : t === "ACTIONS" ? "Actions du jour"
              : "Tickets modifs"}
          </button>
        ))}
      </nav>

      {tab === "KPIS" && <KpisView operatorId={operator.id} />}
      {tab === "PROJECTS" && <ProjectsView operatorId={operator.id} />}
      {tab === "DELIVERABLES" && <DeliverablesView operatorId={operator.id} />}
      {tab === "ACTIONS" && <ActionsView operatorId={operator.id} />}
      {tab === "TICKETS" && <TicketsView operatorId={operator.id} />}
    </div>
  );
}

function KpisView({ operatorId }: { operatorId: string }) {
  const { data: stats } = trpc.campaignDeliverable.statsForOperator.useQuery({ operatorId });

  const totalDeliverables = stats?.total ?? 0;
  const ragRed = stats?.byRag.RED ?? 0;
  const ragAmber = stats?.byRag.AMBER ?? 0;
  const ragGreen = stats?.byRag.GREEN ?? 0;
  // lafusee:allow-adhoc-completion — % de livrables VALIDATED (stats opérateur), pas de la complétion pillaire
  const validatedPct = totalDeliverables > 0 ? Math.round(((stats?.byStatus.VALIDATED ?? 0) / totalDeliverables) * 100) : 0;

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KpiCard icon={<Layers className="h-5 w-5" />} label="Livrables totaux" value={totalDeliverables} />
      <KpiCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} label="Validated" value={`${validatedPct}%`} />
      <KpiCard icon={<AlertTriangle className="h-5 w-5 text-error" />} label="RAG RED" value={ragRed} highlight={ragRed > 0} />
      <KpiCard icon={<Activity className="h-5 w-5 text-amber-400" />} label="RAG AMBER" value={ragAmber} />

      <div className="col-span-2 rounded border border-zinc-700 p-4 sm:col-span-4">
        <h3 className="mb-3 text-sm font-medium text-foreground-secondary">Distribution RAG</h3>
        <div className="flex h-2 overflow-hidden rounded bg-zinc-800">
          {totalDeliverables > 0 && (
            <>
              {/* lafusee:allow-adhoc-completion — largeurs de barre distribution RAG, pas de la complétion pillaire */}
              <div className="bg-emerald-500" style={{ width: `${(ragGreen / totalDeliverables) * 100}%` }} />
              <div className="bg-amber-500" style={{ width: `${(ragAmber / totalDeliverables) * 100}%` }} />
              <div className="bg-error" style={{ width: `${(ragRed / totalDeliverables) * 100}%` }} />
            </>
          )}
        </div>
        <div className="mt-2 flex justify-between text-xs text-foreground-secondary">
          <span>GREEN: {ragGreen}</span>
          <span>AMBER: {ragAmber}</span>
          <span>RED: {ragRed}</span>
        </div>
      </div>
    </section>
  );
}

function ProjectsView({ operatorId }: { operatorId: string }) {
  const { data: deliverables } = trpc.campaignDeliverable.listForOperator.useQuery({ operatorId });
  // Group by campaignId
  const byCampaign = new Map<string, { campaign: { id: string; name: string; strategyId: string }; total: number; ragCounts: Record<string, number> }>();
  for (const d of deliverables ?? []) {
    const entry = byCampaign.get(d.campaignId) ?? {
      campaign: d.campaign,
      total: 0,
      ragCounts: { GREEN: 0, AMBER: 0, RED: 0 },
    };
    entry.total++;
    entry.ragCounts[d.rag] = (entry.ragCounts[d.rag] ?? 0) + 1;
    byCampaign.set(d.campaignId, entry);
  }
  const projects = [...byCampaign.values()].sort(
    (a, b) => (b.ragCounts.RED ?? 0) - (a.ragCounts.RED ?? 0),
  );

  if (projects.length === 0) {
    return (
      <div className="rounded border border-dashed border-zinc-700 p-6 text-center text-sm text-foreground-secondary">
        Aucune campagne avec des livrables. Crée des CampaignDeliverable depuis une page campagne pour les voir ici.
      </div>
    );
  }

  return (
    <section className="overflow-x-auto rounded border border-zinc-700">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 text-xs uppercase tracking-wide text-foreground-secondary">
          <tr>
            <th className="p-2 text-left">Campagne</th>
            <th className="p-2 text-right">Livrables</th>
            <th className="p-2 text-right">🔴 RED</th>
            <th className="p-2 text-right">🟡 AMBER</th>
            <th className="p-2 text-right">🟢 GREEN</th>
            <th className="p-2 text-left">Lien</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.campaign.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
              <td className="p-2 font-medium">{p.campaign.name}</td>
              <td className="p-2 text-right">{p.total}</td>
              <td className="p-2 text-right">{p.ragCounts.RED ?? 0}</td>
              <td className="p-2 text-right">{p.ragCounts.AMBER ?? 0}</td>
              <td className="p-2 text-right">{p.ragCounts.GREEN ?? 0}</td>
              <td className="p-2">
                <Link
                  href={`/cockpit/operate/campaigns/${p.campaign.id}`}
                  className="text-accent hover:underline"
                >
                  Détail →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DeliverablesView({ operatorId }: { operatorId: string }) {
  const [filterRag, setFilterRag] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  const { data: deliverables } = trpc.campaignDeliverable.listForOperator.useQuery({
    operatorId,
    rag: filterRag.length > 0 ? (filterRag as Array<"GREEN" | "AMBER" | "RED">) : undefined,
    status: filterStatus.length > 0 ? filterStatus : undefined,
  });

  return (
    <section className="flex flex-col gap-3">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 rounded border border-zinc-800 p-3">
        <FilterGroup label="RAG" options={["GREEN", "AMBER", "RED"]} selected={filterRag} onChange={setFilterRag} />
        <FilterGroup label="Status" options={["TODO", "IN_PROGRESS", "DELIVERED", "VALIDATED"]} selected={filterStatus} onChange={setFilterStatus} />
      </div>

      {/* Table */}
      {!deliverables || deliverables.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-700 p-6 text-center text-sm text-foreground-secondary">
          Aucun livrable correspondant. Crée des CampaignDeliverable matrice 6D depuis une page campagne.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-700">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/50 text-foreground-secondary">
              <tr>
                <th className="p-2 text-left">Campagne</th>
                <th className="p-2 text-left">SKU (target)</th>
                <th className="p-2 text-left">Cluster</th>
                <th className="p-2 text-left">Pays</th>
                <th className="p-2 text-left">Format</th>
                <th className="p-2 text-left">Promo</th>
                <th className="p-2 text-left">Lang</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">RAG</th>
                <th className="p-2 text-left">Due</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d) => (
                <tr key={d.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                  <td className="p-2">
                    <Link
                      href={`/console/operate/africa-portfolio/deliverable/${d.id}`}
                      className="hover:text-accent hover:underline"
                    >
                      {d.campaign.name}
                    </Link>
                  </td>
                  <td className="p-2 font-mono text-[10px]">{d.targetNodeId.slice(0, 10)}…</td>
                  <td className="p-2">{d.clusterTag ?? "—"}</td>
                  <td className="p-2">{d.countryCode ?? "—"}</td>
                  <td className="p-2">{d.deliverableType}</td>
                  <td className="p-2">{d.promoTag ?? "—"}</td>
                  <td className="p-2">{d.language}</td>
                  <td className="p-2">{d.status}</td>
                  <td className="p-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${RAG_COLORS[d.rag] ?? ""}`}>
                      {d.rag}
                    </span>
                  </td>
                  <td className="p-2">{d.dueDate ? new Date(d.dueDate).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Phase 18-A1-γ — Actions du jour (sheet ACTIONS V4)
// ──────────────────────────────────────────────────────────────────────

function ActionsView({ operatorId }: { operatorId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const { data: actions } = trpc.operatorAction.listForOperator.useQuery({
    operatorId,
    done: showDone ? undefined : false,
  });
  const utils = trpc.useUtils();
  const toggleMutation = trpc.operatorAction.toggleDone.useMutation({
    onSuccess: () => utils.operatorAction.invalidate(),
  });

  const PRIO_COLORS: Record<string, string> = {
    CRITIQUE: "bg-error/15 text-error",
    HAUTE: "bg-amber-500/15 text-amber-300",
    MOYENNE: "bg-blue-500/15 text-blue-300",
    BASSE: "bg-zinc-500/15 text-zinc-300",
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          <span className="text-sm text-foreground-secondary">
            {actions?.length ?? 0} actions {showDone ? "(toutes)" : "à faire"}
          </span>
          <label className="flex items-center gap-1.5 text-xs text-foreground-secondary ml-3">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
            />
            Inclure les FAIT
          </label>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
        >
          {showForm ? "Annuler" : "+ Nouvelle action"}
        </button>
      </div>

      {showForm && (
        <div className="rounded border border-zinc-700 bg-zinc-900/50">
          <OperatorActionForm
            operatorId={operatorId}
            strategyId={`audit:${operatorId}`}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {!actions || actions.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-700 p-6 text-center text-sm text-foreground-secondary">
          Aucune action {showDone ? "" : "à faire"} pour cet opérateur.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {actions.map((a) => (
            <li
              key={a.id}
              className={`flex items-start gap-3 rounded border border-zinc-800 p-3 hover:bg-zinc-900/50 ${a.done ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={a.done}
                onChange={(e) =>
                  toggleMutation.mutate({
                    strategyId: `audit:${operatorId}`,
                    operatorId,
                    actionId: a.id,
                    done: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium ${a.done ? "line-through" : ""}`}>{a.label}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${PRIO_COLORS[a.priority] ?? ""}`}>
                    {a.priority}
                  </span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-foreground-secondary">
                    {a.category}
                  </span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-foreground-secondary">
                    src: {a.source}
                  </span>
                  {a.dueDate && (
                    <span className="text-[10px] text-foreground-secondary">
                      ⏱ {new Date(a.dueDate).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
                {a.context && (
                  <p className="mt-1 text-xs text-foreground-secondary">{a.context}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Phase 18-A1-β — Tickets modifs (sheet TICKETS MODIFS V4)
// ──────────────────────────────────────────────────────────────────────

function TicketsView({ operatorId }: { operatorId: string }) {
  const { data: tickets } = trpc.campaignChangeRequest.listOpenForOperator.useQuery({ operatorId });

  const IMPACT_COLORS: Record<string, string> = {
    COSMETIC: "bg-emerald-500/15 text-emerald-300",
    MINOR: "bg-amber-500/15 text-amber-300",
    MAJOR: "bg-error/15 text-error",
    OUT_OF_SCOPE: "bg-zinc-500/15 text-zinc-300",
  };
  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-zinc-500/15 text-zinc-300",
    IN_PROGRESS: "bg-blue-500/15 text-blue-300",
    ESCALATED: "bg-error/15 text-error",
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4" />
        <span className="text-sm text-foreground-secondary">{tickets?.length ?? 0} tickets ouverts</span>
        <span className="text-xs text-foreground-secondary ml-2">
          (création depuis page CampaignDeliverable détail — workflow PROTOCOLE ABSENCE V4)
        </span>
      </div>

      {!tickets || tickets.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-700 p-6 text-center text-sm text-foreground-secondary">
          Aucun ticket ouvert. Les tickets de modif sont créés depuis la page d'un CampaignDeliverable.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-700">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/50 text-foreground-secondary">
              <tr>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Demandeur</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Impact</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Demandé le</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                  <td className="p-2 font-mono text-[10px]">{t.ticketCode}</td>
                  <td className="p-2">{t.requestedByName}</td>
                  <td className="p-2 max-w-md truncate" title={t.description}>{t.description}</td>
                  <td className="p-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${IMPACT_COLORS[t.impact] ?? ""}`}>
                      {t.impact}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${STATUS_COLORS[t.status] ?? ""}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-2">{new Date(t.requestedAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function KpiCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded border p-4 ${highlight ? "border-error/40 bg-error/5" : "border-zinc-800 bg-zinc-900/30"}`}>
      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
        {icon} {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="mr-2 text-xs font-medium text-foreground-secondary">{label}:</legend>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onChange(active ? selected.filter((x) => x !== opt) : [...selected, opt])}
            className={`rounded px-2 py-0.5 text-xs transition ${
              active
                ? "bg-accent text-white"
                : "bg-zinc-800 text-foreground-secondary hover:bg-zinc-700"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </fieldset>
  );
}
