import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, Send } from "lucide-react";
import { getGuildCommissionRate, listAdminPayouts, type AdminPayoutRow } from "@/server/payouts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney, formatRate, PayoutStatusBadge, totalsLine } from "@/components/payouts/status";
import { PAYOUT_METHOD_LABELS, type PayoutMethod } from "@/domain/payout";
import { ApproveRejectButtons, PayForm } from "./decision-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commissions" };

/**
 * /admin/commissions (WP-024) — la file des gains talents, pendant SORTANT de
 * /admin/paiements : les ordres naissent à la validation des missions Guilde
 * (brut/commission/net figés, taux du référentiel), l'opérateur les approuve
 * puis règle le NET en mobile money et saisit la référence de transaction.
 * Chaque décision est auditée dans la chaîne du workspace payeur.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function methodLabel(method: string): string {
  return PAYOUT_METHOD_LABELS[method as PayoutMethod] ?? method;
}

function TalentCell({ talent }: { talent: AdminPayoutRow["talent"] }) {
  return (
    <div>
      <p className="font-semibold text-ink">{talent.name}</p>
      <p className="text-xs text-smoke">
        {talent.city} ({talent.countryCode})
        {talent.whatsapp ? (
          <>
            {" · "}
            <span className="font-mono">{talent.whatsapp}</span>
          </>
        ) : (
          <span className="text-warning"> · numéro momo/WhatsApp non renseigné</span>
        )}
      </p>
    </div>
  );
}

function AmountsCell({ row }: { row: AdminPayoutRow }) {
  return (
    <div className="whitespace-nowrap font-mono text-xs">
      <p className="font-semibold text-ink">net {formatMoney(row.amountNet, row.currency)}</p>
      <p className="text-smoke">
        brut {formatMoney(row.amountGross, row.currency)} · com. {formatRate(row.commissionRate)}{" "}
        = {formatMoney(row.commissionAmount, row.currency)}
      </p>
    </div>
  );
}

export default async function AdminCommissionsPage() {
  const [payouts, rate] = await Promise.all([listAdminPayouts(20), getGuildCommissionRate()]);
  const { pending, approved, recent, summary } = payouts;

  const tiles = [
    {
      label: "À approuver",
      value: String(summary.counts.PENDING),
      hint: "ordres créés à la validation des missions Guilde",
    },
    {
      label: "Net à payer (approuvés)",
      value: totalsLine(
        approved.reduce<Record<string, number>>((acc, row) => {
          acc[row.currency] = (acc[row.currency] ?? 0) + row.amountNet;
          return acc;
        }, {}),
      ),
      hint: `${summary.counts.APPROVED} ordre${summary.counts.APPROVED > 1 ? "s" : ""} en file momo`,
    },
    {
      label: "Net reversé aux talents",
      value: totalsLine(summary.paidNetByCurrency),
      hint: `${summary.counts.PAID} paiement${summary.counts.PAID > 1 ? "s" : ""} — par devise, jamais additionnées`,
    },
    {
      label: "Commissions encaissées",
      value: totalsLine(summary.paidCommissionByCurrency),
      hint: "part UPgraders des ordres payés",
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Commissions talents</h1>
        <p className="text-sm text-smoke">
          La boucle guilde → mobile money : chaque mission Guilde validée crée un ordre de gain
          (brut, commission, net figés à la création). Approuver fait entrer l&apos;ordre en file
          de paiement ; Marquer payé enregistre le versement momo réel et sa référence. Tout est
          audité.
        </p>
        <p className="text-sm text-smoke">
          Taux de commission en vigueur :{" "}
          {rate ? (
            <>
              <span className="font-mono font-semibold text-ink">{formatRate(rate.value)}</span>
              {rate.placeholder ? (
                <span className="ml-1.5 text-warning">à confirmer (ligne placeholder)</span>
              ) : null}
              {" — "}
            </>
          ) : (
            <span className="font-semibold text-coral-deep">
              référentiel non seedé (famille «&nbsp;commission&nbsp;», clé «&nbsp;guild.rate&nbsp;») — les
              validations de missions Guilde sont bloquées.{" "}
            </span>
          )}
          <Link href="/admin/referentiels" className="font-semibold text-coral hover:underline">
            éditer dans Référentiels
          </Link>
        </p>
      </header>

      {/* ── Totaux (par devise — jamais additionnées entre elles) ────── */}
      <section className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4" aria-label="Totaux commissions">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-smoke">{tile.label}</p>
            <p className="font-display mt-2 text-2xl font-semibold text-ink">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </section>

      {/* ── File 1 : à approuver ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">
          À approuver {pending.length > 0 ? `(${pending.length})` : ""}
        </h2>
        {pending.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<HandCoins />}
            title="Aucun ordre en attente d'approbation"
            description="Les ordres de gain naissent quand une marque valide une mission gagnée via la Guilde — ils arrivent ici dans l'ordre de création, jamais avant."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Mission</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Talent</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Client payeur</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Montants</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Créé le</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Décision</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id} className="border-b border-ink/5 align-top last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{row.missionTitle}</td>
                    <td className="px-4 py-3">
                      <TalentCell talent={row.talent} />
                    </td>
                    <td className="px-4 py-3 text-graphite">{row.workspaceName}</td>
                    <td className="px-4 py-3">
                      <AmountsCell row={row} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ApproveRejectButtons payoutId={row.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── File 2 : approuvés → payer (momo) ────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">
          À payer {approved.length > 0 ? `(${approved.length})` : ""}
        </h2>
        {approved.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<Send />}
            title="Aucun ordre approuvé en attente de paiement"
            description="Approuvez un ordre ci-dessus pour l'amener ici. Le versement se fait en mobile money (Wave, Orange Money, MTN MoMo, Moov) vers le numéro du talent, puis la référence de transaction est saisie — engagement : sous 72 h ouvrées après validation."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Mission</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Talent (rail momo)</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Net à verser</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Approuvé le</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Paiement</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((row) => (
                  <tr key={row.id} className="border-b border-ink/5 align-top last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{row.missionTitle}</td>
                    <td className="px-4 py-3">
                      <TalentCell talent={row.talent} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                      {formatMoney(row.amountNet, row.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {row.approvedAt ? DATE_FORMAT.format(row.approvedAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PayForm payoutId={row.id} />
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
        {recent.length === 0 ? (
          <p className="text-sm text-smoke">Aucune décision terminale enregistrée pour le moment.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Mission</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Talent</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Net</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Rail · Référence</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Payé le</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{row.missionTitle}</td>
                    <td className="px-4 py-3 text-graphite">{row.talent.name}</td>
                    <td className="px-4 py-3">
                      <PayoutStatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-graphite">
                      {formatMoney(row.amountNet, row.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {row.status === "PAID"
                        ? `${methodLabel(row.method)}${row.reference ? ` · ${row.reference}` : ""}`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {row.paidAt ? DATE_FORMAT.format(row.paidAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
