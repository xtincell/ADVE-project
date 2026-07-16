"use client";

/**
 * /console/socle/manual-subscriptions — Operations admin: manual payment queue.
 *
 * The production payment path (ADR-0075 — no auto-provider creds required): a user
 * clicks "Payer" on /pricing, is redirected to the operator's WhatsApp, and a
 * `pending_manual` Subscription is recorded here. The operator confirms payment
 * (received via WhatsApp / mobile money) and validates it → the tier activates
 * (status → "active", 30-day period). checkPaidTier only honours active/trialing,
 * so a request grants NO access until validated here.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CheckCircle2, XCircle, Clock, MessageCircle } from "lucide-react";

type Filter = "pending_manual" | "active" | "rejected_manual" | "all";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "pending_manual", label: "En attente" },
  { key: "active", label: "Validées" },
  { key: "rejected_manual", label: "Refusées" },
  { key: "all", label: "Toutes" },
];

function snap(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export default function ManualSubscriptionsPage() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>("pending_manual");
  const { data: rows, isLoading } = trpc.payment.listManualSubscriptions.useQuery({ status: filter });

  const invalidate = () => utils.payment.listManualSubscriptions.invalidate();
  const approve = trpc.payment.approveManualSubscription.useMutation({ onSuccess: invalidate });
  const reject = trpc.payment.rejectManualSubscription.useMutation({ onSuccess: invalidate });
  const pending = approve.isPending || reject.isPending;

  if (isLoading) return <SkeletonPage />;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Abonnements manuels"
        description="File des demandes d'abonnement reçues via WhatsApp. Confirmez le paiement puis validez pour activer l'accès du client."
      />

      <div role="tablist" aria-label="Filtre statut" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-background text-foreground-secondary hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!rows || rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-6 py-16 text-center">
          <MessageCircle className="h-8 w-8 text-foreground-muted" aria-hidden />
          <p className="mt-3 text-sm text-foreground-secondary">Aucune demande {filter === "pending_manual" ? "en attente" : ""}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wider text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Réf</th>
                <th className="px-4 py-3 font-medium">Formule</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Demandé le</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = snap(r.providerSnapshot);
                const isPending = r.status === "pending_manual";
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    {/* La réf envoyée au client sur WhatsApp — le rapprochement se fait
                        par elle, pas au nom/email (audit 2026-07-16). */}
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {r.providerSubscriptionId.replace(/^manual-wa:/, "").replace(/^admin-free:/, "")}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{r.tierKey}</td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {r.amountPerPeriod.toLocaleString("fr-FR")} {r.currency}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      <div>{(meta.contactName as string) ?? "—"}</div>
                      <div className="text-xs text-foreground-muted">{(meta.contactEmail as string) ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground-muted">
                      {new Date(r.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          r.status === "pending_manual"
                            ? "text-accent"
                            : r.status === "active"
                              ? "text-foreground"
                              : "text-error"
                        }`}
                      >
                        {r.status === "pending_manual" ? <Clock className="h-3.5 w-3.5" /> : r.status === "active" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {r.status === "pending_manual" ? "En attente" : r.status === "active" ? "Validée" : "Refusée"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPending && (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => approve.mutate({ subscriptionId: r.id })}
                            disabled={pending}
                            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                          </button>
                          <button
                            onClick={() => reject.mutate({ subscriptionId: r.id })}
                            disabled={pending}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Refuser
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OneShotQueue />
    </section>
  );
}

/**
 * Paiements one-shot manuels du funnel (PDF / Stratégie complète payés sur
 * WhatsApp faute de provider configuré — audit 2026-07-16). Valider = PAID +
 * fulfillment (le lien du lead se déverrouille tout seul).
 */
function OneShotQueue() {
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.payment.listManualIntakePayments.useQuery({ status: "PENDING" });
  const invalidate = () => utils.payment.listManualIntakePayments.invalidate();
  const approve = trpc.payment.approveManualIntakePayment.useMutation({ onSuccess: invalidate });
  const reject = trpc.payment.rejectManualIntakePayment.useMutation({ onSuccess: invalidate });
  const pending = approve.isPending || reject.isPending;

  if (isLoading || !rows || rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Paiements one-shot (diagnostic / stratégie) en attente</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wider text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Réf</th>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Demandé le</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{p.reference}</td>
                <td className="px-4 py-3 text-foreground-secondary">
                  {p.tierKey === "ORACLE_FULL" ? "Stratégie complète" : "Rapport PDF complet"}
                </td>
                <td className="px-4 py-3 text-foreground-secondary">
                  {p.amount.toLocaleString("fr-FR")} {p.currency}
                </td>
                <td className="px-4 py-3 text-xs text-foreground-muted">
                  {new Date(p.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => approve.mutate({ reference: p.reference })}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                    </button>
                    <button
                      onClick={() => reject.mutate({ reference: p.reference })}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Refuser
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
