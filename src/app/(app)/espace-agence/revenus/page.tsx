import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HandCoins, Wallet } from "lucide-react";
import { readSession } from "@/lib/session";
import { getFleetRevenue } from "@/server/agency";
import { PLAN_LABELS } from "@/server/market";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AgencyNav } from "../nav";
import { NoAgencyState } from "../no-agency";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Revenus — Espace agence" };

/**
 * /espace-agence/revenus — port HONNÊTE de `(agency)/agency/revenue` legacy.
 * Le legacy affichait des commissions par mission (grossAmount, taux, fee
 * opérateur) — AUCUNE table de commission n'existe en v7 : cette partie reste
 * une carte « à venir », zéro chiffre inventé. Ce qui est réel et affiché :
 * les paiements `confirmed` de la flotte (totaux par mois et PAR DEVISE,
 * ventilés par client) et un MRR simple dérivé des abonnements actifs
 * (paiements réellement encaissés, normalisés 30 j par la période du plan).
 */

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");
const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Convention finance v7 : les francs CFA (XOF/XAF) se disent « FCFA ». */
function formatMoney(amount: number, currency: string): string {
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  return `${NUMBER_FORMAT.format(amount)} ${unit}`;
}

/** « 2026-07 » (clé UTC de l'agrégation) → « juillet 2026 ». */
function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return MONTH_FORMAT.format(new Date(Date.UTC(year ?? 1970, (m ?? 1) - 1, 1)));
}

/** Totaux par devise → ligne affichable, devises triées (jamais additionnées). */
function totalsLine(totals: Record<string, number>): string {
  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 0
    ? entries.map(([cur, amount]) => formatMoney(amount, cur)).join(" · ")
    : "—";
}

export default async function AgencyRevenuePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/espace-agence/revenus");

  const revenue = await getFleetRevenue(session);
  if (!revenue) return <NoAgencyState title="Revenus" />;

  const { agency, workspaceNames, months, confirmedPaymentCount, mrr, activeSubscriptions } =
    revenue;

  // Encaissé total par devise = repli des lignes mensuelles (déjà réelles).
  const grandTotals: Record<string, number> = {};
  for (const month of months) {
    for (const [currency, amount] of Object.entries(month.totals)) {
      grandTotals[currency] = (grandTotals[currency] ?? 0) + amount;
    }
  }

  const tiles = [
    {
      label: "Paiements confirmés",
      value: String(confirmedPaymentCount),
      hint: "table Payment, statut confirmed",
    },
    {
      label: "Encaissé (total)",
      value: totalsLine(grandTotals),
      hint: "par devise — jamais additionnées entre elles",
    },
    {
      label: "MRR simple",
      value: totalsLine(mrr.byCurrency),
      hint: "paiements réels des abonnements actifs, normalisés 30 j",
    },
    {
      label: "Abonnements actifs",
      value: String(activeSubscriptions),
      hint: "règle canon finance.ts, à l'instant T",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Espace agence — {agency.name}</p>
        <h1 className="font-display text-3xl font-semibold">Revenus</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          Uniquement des lignes réelles : paiements confirmés de la flotte et abonnements
          actifs. Rien n&apos;est projeté, rien n&apos;est converti entre devises.
        </p>
      </header>

      <AgencyNav />

      {/* ── Compteurs ──────────────────────────────────────────────────── */}
      <section className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4" aria-label="Compteurs revenus">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-ink-2 p-6">
            <p className="text-sm font-medium text-sand">{tile.label}</p>
            <p className="font-display mt-2 text-2xl font-semibold text-bone">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </section>

      {/* ── Mois par mois ──────────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Paiements confirmés par mois">
        <div>
          <h2 className="font-display text-xl font-semibold">Mois par mois</h2>
          <p className="text-sm text-sand">
            Paiements confirmés agrégés par mois (UTC) puis ventilés par client.
          </p>
        </div>

        {months.length === 0 ? (
          <EmptyState
            icon={<Wallet />}
            title="Aucun paiement confirmé"
            description="Dès qu'un paiement d'un client de la flotte est validé par l'opérateur, il apparaît ici — jamais avant."
          />
        ) : (
          <div className="space-y-3">
            {months.map((month) => (
              <div key={month.month} className="rounded-lg border border-line bg-ink-2">
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-soft px-5 py-4">
                  <p className="font-display text-base font-semibold capitalize text-bone">
                    {monthLabel(month.month)}
                  </p>
                  <p className="text-sm text-sand">
                    <span className="font-mono text-xs text-smoke-2">
                      {month.count} paiement{month.count > 1 ? "s" : ""} ·{" "}
                    </span>
                    <span className="font-semibold text-bone">{totalsLine(month.totals)}</span>
                  </p>
                </div>
                <ul className="divide-y divide-line-soft">
                  {month.byWorkspace.map((ws) => (
                    <li
                      key={ws.workspaceId}
                      className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm"
                    >
                      <span className="text-sand">
                        {workspaceNames[ws.workspaceId] ?? ws.workspaceId}
                        <span className="ml-2 font-mono text-xs text-smoke-2">
                          {ws.count} paiement{ws.count > 1 ? "s" : ""}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-sand">{totalsLine(ws.totals)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── MRR simple ─────────────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="MRR simple">
        <div>
          <h2 className="font-display text-xl font-semibold">MRR simple</h2>
          <p className="text-sm text-sand">
            Pour chaque abonnement actif : le paiement confirmé qui l&apos;a activé, ramené à
            30 jours par la période réelle de son plan (Cockpit 30 j, Retainer 92 j).
          </p>
        </div>

        {mrr.contributions.length === 0 && mrr.unresolved.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-ink-2/50 px-5 py-6 text-sm text-sand">
            Aucun abonnement actif dans la flotte — le MRR n&apos;existe pas encore, il ne
            s&apos;invente pas.
          </p>
        ) : (
          <>
            {mrr.contributions.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-line bg-ink-2">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="px-4 py-3 font-semibold text-sand">Client</th>
                      <th className="px-4 py-3 font-semibold text-sand">Plan</th>
                      <th className="px-4 py-3 font-semibold text-sand">Payé</th>
                      <th className="px-4 py-3 font-semibold text-sand">Équivalent 30 j</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mrr.contributions.map((row, index) => (
                      <tr
                        key={`${row.workspaceId}-${row.plan}-${index}`}
                        className="border-b border-line-soft last:border-0"
                      >
                        <td className="px-4 py-3 text-sand">{row.workspaceName}</td>
                        <td className="px-4 py-3">
                          <Badge variant="inverse">{PLAN_LABELS[row.plan]}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                          {formatMoney(row.amount, row.currency)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-bone">
                          {formatMoney(row.monthly, row.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {mrr.unresolved.length > 0 ? (
              <div className="rounded-lg border border-dashed border-coral/40 bg-ink-2/50 px-5 py-4">
                <p className="text-sm font-semibold text-coral">
                  {mrr.unresolved.length} abonnement{mrr.unresolved.length > 1 ? "s" : ""} actif
                  {mrr.unresolved.length > 1 ? "s" : ""} hors MRR — montant réel non dérivable :
                </p>
                <ul className="mt-2 space-y-1 text-xs text-sand">
                  {mrr.unresolved.map((row) => (
                    <li key={`${row.workspaceId}-${row.plan}`}>
                      <span className="font-semibold">{row.workspaceName}</span> ({row.plan}) —{" "}
                      {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* ── Commissions (à venir — honnête) ────────────────────────────── */}
      <section className="space-y-4" aria-label="Commissions d'agence">
        <h2 className="font-display text-xl font-semibold">Commissions d&apos;agence</h2>
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-line bg-ink-2/50 p-6">
          <div className="flex items-center justify-between">
            <span className="text-smoke-2 [&_svg]:size-5" aria-hidden>
              <HandCoins />
            </span>
            <Badge variant="outline">À venir</Badge>
          </div>
          <h3 className="font-display text-base font-semibold text-bone">
            Pas de table de commission en v7
          </h3>
          <p className="text-sm leading-relaxed text-sand">
            L&apos;ancien portail calculait par mission un montant brut, un taux de commission et
            un fee opérateur. Ce moteur reviendra branché sur de vraies tables — aucun chiffre ne
            sera montré avant d&apos;être calculé sur des lignes réelles.
          </p>
        </div>
      </section>
    </div>
  );
}
