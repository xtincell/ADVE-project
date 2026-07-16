/**
 * /cockpit/settings/billing — Abonnement & facturation founder (vague E, P0).
 *
 * Le backend existait (payment.mySubscriptions / cancelSubscription /
 * initSubscription, deux-rails ADR-0092) mais AUCUNE surface cockpit ne le
 * rendait : le founder ne pouvait ni voir son abonnement, ni l'annuler, ni
 * savoir qu'une demande manuelle attendait validation. États honnêtes :
 * active / trialing / pending_manual (n'accorde RIEN tant que l'opérateur
 * n'a pas validé) / past_due / canceled.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { CreditCard, Loader2, ArrowRight, XCircle } from "lucide-react";
import {
  TIER_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/billing/subscription-labels";

const STATUS_LABEL = SUBSCRIPTION_STATUS_LABELS;
const TIER_LABEL = TIER_LABELS;

function formatAmount(amount: number, currency: string): string {
  // Stripe stocke les devises carte en centimes ; FCFA/mobile money en unités.
  const isCents = currency === "EUR" || currency === "USD" || currency === "MAD";
  const value = isCents ? amount / 100 : amount;
  return `${new Intl.NumberFormat("fr-FR").format(value)} ${currency}`;
}

export default function CockpitBillingPage() {
  const utils = trpc.useUtils();
  const { data: subscriptions, isLoading } = trpc.payment.mySubscriptions.useQuery();
  const cancelMutation = trpc.payment.cancelSubscription.useMutation({
    onSuccess: () => utils.payment.mySubscriptions.invalidate(),
  });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const current = (subscriptions ?? []).filter((s) => s.status === "active" || s.status === "trialing" || s.status === "pending_manual");
  const past = (subscriptions ?? []).filter((s) => !current.some((c) => c.id === s.id));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Abonnement & facturation</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Votre plan La Fusée, sa période en cours et son historique.
        </p>
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      )}

      {!isLoading && current.length === 0 && (
        <section className="rounded-lg border border-border bg-background-raised p-6 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-foreground-muted" />
          <p className="mt-3 text-sm text-foreground">Aucun abonnement actif.</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Le Cockpit complet (Oracle, forge, intelligence) est débloqué par un plan mensuel.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Voir les plans <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      {current.map((sub) => {
        const status = STATUS_LABEL[sub.status] ?? { label: sub.status, tone: "muted" as const };
        return (
          <section key={sub.id} className="space-y-4 rounded-lg border border-border bg-background-raised p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{TIER_LABEL[sub.tierKey] ?? sub.tierKey}</h2>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  {formatAmount(sub.amountPerPeriod, sub.currency)} / mois
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  status.tone === "ok"
                    ? "border-primary/40 text-primary"
                    : status.tone === "warn"
                      ? "border-warning/50 text-warning"
                      : "border-border-subtle text-foreground-muted"
                }`}
              >
                {status.label}
              </span>
            </div>

            {sub.status === "pending_manual" && (
              <p className="rounded-lg border border-warning/30 bg-background p-3 text-xs text-foreground-secondary">
                Votre demande de paiement manuel est enregistrée. Elle n&apos;accorde l&apos;accès qu&apos;après
                validation par l&apos;équipe — vous serez notifié dès l&apos;encaissement confirmé.
              </p>
            )}

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {sub.currentPeriodStart && (
                <div>
                  <dt className="text-xs text-foreground-muted">Période en cours</dt>
                  <dd className="text-foreground">
                    {new Date(sub.currentPeriodStart).toLocaleDateString("fr-FR")}
                    {" → "}
                    {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR") : "—"}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-foreground-muted">Mode de paiement</dt>
                <dd className="text-foreground">
                  {sub.providerSubscriptionId.startsWith("manual:") || sub.providerSubscriptionId.startsWith("manual-")
                    ? "Cycle manuel (mobile money / WhatsApp)"
                    : sub.providerSubscriptionId.startsWith("admin-free:")
                      ? "Compte équipe (gratuit)"
                      : "Carte (renouvellement automatique)"}
                </dd>
              </div>
            </dl>

            {/* Échec d'annulation VISIBLE (audit 2026-07-16 : le bouton faisait
                « Annulation… » puis rien — l'erreur n'était jamais rendue). */}
            {cancelMutation.error && confirmingId === null ? (
              <p className="text-xs text-warning">
                L&apos;annulation n&apos;a pas abouti — réessayez ou contactez-nous.
              </p>
            ) : null}
            {sub.cancelAtPeriodEnd ? (
              <p className="text-xs text-foreground-muted">
                Annulation programmée — l&apos;accès reste actif jusqu&apos;à la fin de la période en cours.
              </p>
            ) : sub.status !== "pending_manual" ? (
              confirmingId === sub.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-foreground-secondary">
                    Confirmer l&apos;annulation à la fin de la période ?
                  </p>
                  <button
                    onClick={() => {
                      cancelMutation.mutate({ subscriptionId: sub.id });
                      setConfirmingId(null);
                    }}
                    disabled={cancelMutation.isPending}
                    className="rounded-lg border border-warning/50 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10"
                  >
                    {cancelMutation.isPending ? "Annulation…" : "Oui, annuler"}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary"
                  >
                    Garder mon plan
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(sub.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-warning"
                >
                  <XCircle className="h-3.5 w-3.5" /> Annuler à la fin de la période
                </button>
              )
            ) : null}
          </section>
        );
      })}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Historique</h2>
          <ul className="space-y-1">
            {past.map((sub) => (
              <li
                key={sub.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-background-raised px-4 py-2 text-sm"
              >
                <span className="text-foreground">{TIER_LABEL[sub.tierKey] ?? sub.tierKey}</span>
                <span className="text-xs text-foreground-muted">
                  {formatAmount(sub.amountPerPeriod, sub.currency)} · {(STATUS_LABEL[sub.status] ?? { label: sub.status }).label}
                  {sub.cancelledAt ? ` · annulé le ${new Date(sub.cancelledAt).toLocaleDateString("fr-FR")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-foreground-muted">
        Question sur une facture ou un encaissement mobile money ? Écrivez-nous — les demandes manuelles sont
        validées par un opérateur, jamais automatiquement.
      </p>
    </div>
  );
}
