/**
 * /console/operate/africa-portfolio/deliverable/[id] — Phase 18-A1-α/β.
 *
 * Page détail d'un CampaignDeliverable avec UI ticket inline. Ferme la boucle
 * UX β : créer / lister / résoudre des CampaignChangeRequest depuis la page
 * du livrable concerné (vs uniquement via API).
 */

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Dialog } from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { CampaignChangeRequestForm } from "@/components/portfolio/CampaignChangeRequestForm";
import { usePortfolioOperator } from "@/components/portfolio/use-portfolio-operator";
import {
  ArrowLeft, Ticket, AlertTriangle, CheckCircle2,
  Clock, Tag, MapPin, Globe, FileText, Edit3,
} from "lucide-react";

const RAG_COLORS: Record<string, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-300",
  AMBER: "bg-amber-500/15 text-amber-300",
  RED: "bg-error/15 text-error",
};
const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-zinc-500/15 text-zinc-300",
  IN_PROGRESS: "bg-blue-500/15 text-blue-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-300",
  VALIDATED: "bg-emerald-500/30 text-emerald-200",
};
const IMPACT_COLORS: Record<string, string> = {
  COSMETIC: "bg-emerald-500/15 text-emerald-300",
  MINOR: "bg-amber-500/15 text-amber-300",
  MAJOR: "bg-error/15 text-error",
  OUT_OF_SCOPE: "bg-zinc-500/15 text-zinc-300",
};
const TICKET_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-zinc-500/15 text-zinc-300",
  IN_PROGRESS: "bg-blue-500/15 text-blue-300",
  RESOLVED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-zinc-500/15 text-zinc-400",
  ESCALATED: "bg-error/15 text-error",
};

const TABS = ["DETAILS", "TICKETS"] as const;
type Tab = (typeof TABS)[number];

export default function DeliverableDetailPage() {
  const params = useParams<{ id: string }>();
  const deliverableId = params.id;

  const [tab, setTab] = useState<Tab>("DETAILS");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [decision, setDecision] = useState<{ ticketId: string; action: "resolve" | "escalate" } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  const { operator, error: operatorError, isLoading: operatorLoading, refetch: refetchOperator } = usePortfolioOperator();
  const operatorQuery = operator ? `?operator=${encodeURIComponent(operator.id)}` : "";

  const { data: deliverables, error: deliverablesError, isLoading: deliverablesLoading, refetch: refetchDeliverables } = trpc.campaignDeliverable.listForOperator.useQuery(
    { operatorId: operator?.id ?? "" },
    { enabled: Boolean(operator?.id) },
  );
  const deliverable = deliverables?.find((d) => d.id === deliverableId);

  const { data: tickets, error: ticketsError, isLoading: ticketsLoading, refetch: refetchTickets } = trpc.campaignChangeRequest.listForDeliverable.useQuery(
    { deliverableId },
    { enabled: Boolean(deliverableId) },
  );

  const utils = trpc.useUtils();
  const updateMutation = trpc.campaignDeliverable.update.useMutation({
    onSuccess: () => utils.campaignDeliverable.invalidate(),
  });
  const resolveMutation = trpc.campaignChangeRequest.resolve.useMutation({
    onSuccess: () => { setDecision(null); setDecisionNotes(""); void refetchTickets(); },
  });
  const escalateMutation = trpc.campaignChangeRequest.escalate.useMutation({
    onSuccess: () => { setDecision(null); setDecisionNotes(""); void refetchTickets(); },
  });

  if (operatorError || deliverablesError) return <div className="space-y-3 p-6" role="alert">
    <p>{operatorError?.message ?? deliverablesError?.message}</p>
    <Button variant="outline" onClick={() => { void refetchOperator(); void refetchDeliverables(); }}>Réessayer la lecture</Button>
  </div>;
  if (operatorLoading) return <div className="p-6 text-sm text-foreground-secondary">Chargement de l’équipe…</div>;
  if (!operator) return <div className="space-y-3 p-6">
    <p>Aucune équipe rattachée à ce compte. Le suivi nécessite une équipe.</p>
    <Link href="/console" className="text-accent hover:underline">Retour à la console</Link>
  </div>;
  if (deliverablesLoading) return <div className="p-6 text-sm text-foreground-secondary">Chargement du livrable…</div>;
  if (!deliverable) {
    return (
      <div className="p-6">
        <Link href={`/console/operate/africa-portfolio${operatorQuery}`} className="text-accent hover:underline">
          ← Retour dashboard
        </Link>
        <div className="mt-4 rounded border border-error/30 bg-error/10 p-4 text-sm">
          CampaignDeliverable {deliverableId} introuvable.
        </div>
      </div>
    );
  }

  const handleStatusChange = (newStatus: "TODO" | "IN_PROGRESS" | "DELIVERED" | "VALIDATED") => {
    updateMutation.mutate({
      strategyId: deliverable.campaign.strategyId,
      operatorId: operator.id,
      deliverableId,
      patches: { status: newStatus },
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <Link
          href={`/console/operate/africa-portfolio${operatorQuery}`}
          className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour dashboard
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {deliverable.taskCode ?? deliverable.deliverableType}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Link href={`/cockpit/operate/campaigns/${deliverable.campaignId}${operatorQuery}`} className="text-accent hover:underline">
                {deliverable.campaign.name}
              </Link>
              <span className="text-foreground-secondary">·</span>
              <span className={`rounded px-1.5 py-0.5 text-xs uppercase ${STATUS_COLORS[deliverable.status] ?? ""}`}>
                {deliverable.status}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-xs uppercase ${RAG_COLORS[deliverable.rag] ?? ""}`}>
                RAG {deliverable.rag}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["TODO", "IN_PROGRESS", "DELIVERED", "VALIDATED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updateMutation.isPending || deliverable.status === s}
                className={`rounded px-2 py-1 text-xs ${
                  deliverable.status === s
                    ? "bg-accent text-white"
                    : "border border-zinc-700 hover:bg-zinc-800"
                } disabled:opacity-50`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
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
            {t === "DETAILS" ? "Détails" : `Tickets modifs (${ticketsError ? "lecture impossible" : ticketsLoading || !tickets ? "…" : tickets.length})`}
          </button>
        ))}
      </nav>

      {ticketsError && <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
        <p>Lecture des tickets impossible : {ticketsError.message}</p>
        <Button variant="outline" size="sm" onClick={() => void refetchTickets()}>Réessayer</Button>
      </div>}
      {(updateMutation.error || resolveMutation.error || escalateMutation.error) && <p role="alert" className="text-sm text-error">
        {updateMutation.error?.message ?? resolveMutation.error?.message ?? escalateMutation.error?.message}
      </p>}

      {tab === "DETAILS" && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaItem icon={<Tag className="h-4 w-4" />} label="Format" value={deliverable.deliverableType} />
          <MetaItem icon={<Globe className="h-4 w-4" />} label="Langue" value={deliverable.language} />
          <MetaItem icon={<MapPin className="h-4 w-4" />} label="Country" value={deliverable.countryCode ?? "—"} />
          <MetaItem icon={<MapPin className="h-4 w-4" />} label="Cluster" value={deliverable.clusterTag ?? "—"} />
          <MetaItem icon={<Tag className="h-4 w-4" />} label="Promo" value={deliverable.promoTag ?? "—"} />
          <MetaItem icon={<Clock className="h-4 w-4" />} label="Due" value={deliverable.dueDate ? new Date(deliverable.dueDate).toLocaleDateString("fr-FR") : "—"} />
          <MetaItem icon={<CheckCircle2 className="h-4 w-4" />} label="Delivered" value={deliverable.deliveredAt ? new Date(deliverable.deliveredAt).toLocaleDateString("fr-FR") : "—"} />
          <MetaItem icon={<CheckCircle2 className="h-4 w-4" />} label="Validated" value={deliverable.validatedAt ? new Date(deliverable.validatedAt).toLocaleDateString("fr-FR") : "—"} />

          {deliverable.notes && (
            <div className="col-span-2 sm:col-span-4 rounded border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                <FileText className="h-4 w-4" /> Notes
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{deliverable.notes}</div>
            </div>
          )}
        </section>
      )}

      {tab === "TICKETS" && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <span className="text-sm text-foreground-secondary">
                {ticketsError ? "Lecture impossible" : ticketsLoading || !tickets ? "Lecture des tickets…" : `${tickets.length} demandes de modification`}
              </span>
            </div>
            <button
              onClick={() => setShowTicketForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
            >
              {showTicketForm ? "Annuler" : "+ Nouveau ticket modif"}
            </button>
          </div>

          {showTicketForm && (
            <div className="rounded border border-zinc-700 bg-zinc-900/50">
              <CampaignChangeRequestForm
                campaignDeliverableId={deliverableId}
                strategyId={deliverable.campaign.strategyId}
                operatorId={operator.id}
                onSuccess={() => {
                  setShowTicketForm(false);
                  refetchTickets();
                }}
                onCancel={() => setShowTicketForm(false)}
              />
            </div>
          )}

          {ticketsError ? null : ticketsLoading || !tickets ? <p role="status">Lecture des tickets…</p> : tickets.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-700 p-6 text-center text-sm text-foreground-secondary">
              Aucun ticket modif sur ce livrable. Crée le premier via le bouton ci-dessus si un client demande une modification.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map((t) => (
                <li key={t.id} className="rounded border border-zinc-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="font-mono text-xs">{t.ticketCode}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${IMPACT_COLORS[t.impact] ?? ""}`}>
                          {t.impact}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${TICKET_STATUS_COLORS[t.status] ?? ""}`}>
                          {t.status}
                        </span>
                        <span className="text-xs text-foreground-secondary">
                          De: {t.requestedByName} · {new Date(t.requestedAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{t.description}</p>
                      {t.resolutionNotes && (
                        <p className="mt-2 rounded bg-zinc-900/50 p-2 text-xs text-foreground-secondary">
                          <strong>Notes résolution :</strong> {t.resolutionNotes}
                        </p>
                      )}
                    </div>
                    {t.status !== "RESOLVED" && t.status !== "REJECTED" && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => { setDecisionNotes(""); setDecision({ ticketId: t.id, action: "resolve" }); }}
                          className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/30"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Résoudre
                        </button>
                        {t.impact === "MAJOR" && t.status !== "ESCALATED" && (
                          <button
                            onClick={() => { setDecisionNotes(""); setDecision({ ticketId: t.id, action: "escalate" }); }}
                            className="inline-flex items-center gap-1 rounded bg-error/20 px-2 py-1 text-[10px] text-error hover:bg-error/30"
                          >
                            <AlertTriangle className="h-3 w-3" /> Escalader
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Dialog open={decision !== null} onOpenChange={open => { if (!open) setDecision(null); }}
        title={decision?.action === "resolve" ? "Consigner la résolution" : "Demander un arbitrage"}>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (!decision || !decisionNotes.trim()) return;
          const scope = { strategyId: deliverable.campaign.strategyId, operatorId: operator.id, ticketId: decision.ticketId };
          if (decision.action === "resolve") resolveMutation.mutate({ ...scope, resolutionNotes: decisionNotes.trim(), newBriefVersionId: null });
          else escalateMutation.mutate({ ...scope, escalationNotes: decisionNotes.trim() });
        }}>
          <label className="block space-y-2 text-sm"><span>{decision?.action === "resolve" ? "Modification réalisée et éléments vérifiés" : "Motif et décision attendue"}</span>
            <Textarea required maxLength={2000} value={decisionNotes} onChange={event => setDecisionNotes(event.target.value)} />
          </label>
          {(resolveMutation.error || escalateMutation.error) && <p role="alert" className="text-sm text-error">{resolveMutation.error?.message ?? escalateMutation.error?.message}</p>}
          {decision?.action === "escalate" && <p className="text-xs text-foreground-secondary">Le motif est conservé dans ce dossier. Aucune notification externe n’est envoyée.</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setDecision(null)}>Annuler</Button>
            <Button type="submit" disabled={!decisionNotes.trim() || resolveMutation.isPending || escalateMutation.isPending}>Enregistrer</Button></div>
        </form>
      </Dialog>

    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
        {icon} {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
