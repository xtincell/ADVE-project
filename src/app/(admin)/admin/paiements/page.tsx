import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import {
  listPendingSubscriptions,
  listRecentSubscriptionDecisions,
  subscriptionIsActiveAt,
} from "@/server/finance";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DecisionButtons } from "./decision-buttons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Paiements" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

function formatAmount(amount: number, currency: string): string {
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  return `${NUMBER_FORMAT.format(amount)} ${unit}`;
}

function historyStatus(sub: {
  status: string;
  expiresAt: Date | null;
}): { label: string; variant: BadgeProps["variant"] } {
  if (sub.status === "rejected") return { label: "Rejeté", variant: "outline" };
  if (subscriptionIsActiveAt(sub, new Date())) return { label: "Actif", variant: "gold" };
  return { label: "Échu", variant: "neutral" };
}

export default async function AdminPaiementsPage() {
  const [pending, history] = await Promise.all([
    listPendingSubscriptions(),
    listRecentSubscriptionDecisions(20),
  ]);

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Paiements</h1>
        <p className="text-sm text-smoke">
          File de validation manuelle (WhatsApp) — Valider active le plan (30&nbsp;j Cockpit,
          92&nbsp;j Retainer) et enregistre le Paiement confirmé ; chaque décision est auditée.
        </p>
      </header>

      {/* ── File de validation ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">
          À valider {pending.length > 0 ? `(${pending.length})` : ""}
        </h2>
        {pending.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<Landmark />}
            title="Aucune demande en attente"
            description="Les demandes « Payer via WhatsApp » des workspaces clients arrivent ici, dans l'ordre de soumission."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Référence</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Workspace</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Plan</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Montant attendu</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Demandé le</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Décision</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id} className="border-b border-ink/5 align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{row.workspaceName}</td>
                    <td className="px-4 py-3 text-graphite">{row.planLabel}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-graphite">
                      {row.expected ? (
                        <>
                          {formatAmount(row.expected.amount, row.expected.currency)}
                          {row.expected.placeholder ? (
                            <span className="ml-2 font-sans text-warning">à confirmer</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-smoke-2">pricing non résolu</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(row.requestedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <DecisionButtons subscriptionId={row.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Historique ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Dernières décisions</h2>
        {history.length === 0 ? (
          <p className="text-sm text-smoke">Aucune décision enregistrée pour le moment.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Référence</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Workspace</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Plan</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Début</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sub) => {
                  const status = historyStatus(sub);
                  return (
                    <tr key={sub.id} className="border-b border-ink/5 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                        {sub.reference}
                      </td>
                      <td className="px-4 py-3 text-graphite">{sub.workspaceName}</td>
                      <td className="px-4 py-3 text-graphite">{sub.plan}</td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {DAY_FORMAT.format(sub.startedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {sub.expiresAt ? DAY_FORMAT.format(sub.expiresAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
