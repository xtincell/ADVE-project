import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock3, MessageCircle, TriangleAlert } from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import { canComposeOracle } from "@/server/entitlements";
import {
  getInstructionsForSubscription,
  getSubscriptionState,
  PLAN_PERIOD_DAYS,
  planSchema,
  type SubscriptionInstructions,
  type WorkspaceSubscriptionState,
} from "@/server/finance";
import {
  getPlanPricing,
  MarketError,
  PLAN_CADENCE_LABELS,
  PLAN_LABELS,
  type PlanKey,
  type PlanPricing,
} from "@/server/market";
import { Badge } from "@/components/ui/badge";
import { SubscribeButton } from "./subscribe-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Facturation" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

/** Montant affichable — les francs CFA (XOF/XAF) se disent « FCFA ». */
function formatAmount(amount: number, currency: string): string {
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  return `${NUMBER_FORMAT.format(amount)} ${unit}`;
}

/** Libellé d'un plan relu depuis la DB (String) — la valeur brute sinon. */
function planLabel(raw: string): string {
  const parsed = planSchema.safeParse(raw);
  return parsed.success ? PLAN_LABELS[parsed.data] : raw;
}

/** Copy statique des plans (les MONTANTS, eux, viennent de la base). */
const PLAN_TAGLINES: Record<PlanKey, string> = {
  cockpit: "Pilotez votre marque vous-même — Oracle recomposable en illimité.",
  retainer: "UPgraders aux commandes, avec vous — accompagnement continu.",
};

// ── Badge de statut du plan actuel ─────────────────────────────────────

function StatusBadge({ state }: { state: WorkspaceSubscriptionState }) {
  if (state.active) {
    return (
      <Badge variant="gold">
        Actif jusqu&apos;au {state.active.expiresAt ? DATE_FORMAT.format(state.active.expiresAt) : "—"}
      </Badge>
    );
  }
  if (state.pending.length > 0) {
    return <Badge variant="coral">En attente de validation</Badge>;
  }
  if (state.expired) {
    return <Badge variant="outline">Expiré</Badge>;
  }
  return <Badge variant="outline">Aucun abonnement</Badge>;
}

// ── Bloc d'instructions de paiement (demande pending) ──────────────────

function PaymentInstructions({ instructions }: { instructions: SubscriptionInstructions }) {
  return (
    <div className="rounded-lg border border-coral/40 bg-coral/8 p-5">
      <p className="flex items-center gap-2 font-semibold text-bone">
        <MessageCircle className="size-4.5 shrink-0 text-coral" aria-hidden />
        Finalisez votre paiement — plan {instructions.planLabel}
      </p>
      <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-3 sm:block">
          <dt className="text-sand">Montant à régler</dt>
          <dd className="font-mono font-semibold text-bone">
            {formatAmount(instructions.amount, instructions.currency)}
            {instructions.placeholder ? (
              <span className="ml-2 font-sans text-xs font-normal text-warning">à confirmer</span>
            ) : null}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 sm:block">
          <dt className="text-sand">Référence à mentionner</dt>
          <dd className="font-mono font-semibold text-bone">{instructions.reference}</dd>
        </div>
      </dl>
      <a
        href={instructions.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-coral px-5 text-[15px] font-semibold text-white shadow-glow-coral transition-colors hover:bg-coral-hover [&_svg]:size-[1.1em]"
      >
        <MessageCircle aria-hidden />
        Ouvrir WhatsApp (+{instructions.whatsappNumber})
      </a>
      <p className="mt-3 flex items-start gap-2 text-xs text-sand">
        <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Le message est pré-rempli avec votre référence. Notre équipe valide chaque paiement
        manuellement sous 24&nbsp;h ouvrées — votre accès s&apos;ouvre à la validation.
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function FacturationPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/facturation");

  const brand = await getBrandForSession(session);
  const state = await getSubscriptionState(session.workspaceId);
  const entitlement = await canComposeOracle(session.workspaceId);

  let pricing: PlanPricing | null = null;
  let pricingError: string | null = null;
  try {
    pricing = await getPlanPricing(brand?.countryCode);
  } catch (err) {
    if (!(err instanceof MarketError)) throw err;
    pricingError = err.message;
  }

  // Instructions re-affichées pour chaque demande en attente (habituellement une).
  const pendingInstructions: SubscriptionInstructions[] = [];
  if (!state.active && pricing) {
    for (const sub of state.pending) {
      if (!planSchema.safeParse(sub.plan).success) continue;
      pendingInstructions.push(await getInstructionsForSubscription(sub));
    }
  }

  const now = Date.now();
  const inGrace =
    !state.active && entitlement.graceEndsAt !== null && entitlement.graceEndsAt.getTime() > now;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Compte</p>
        <h1 className="font-display text-3xl font-semibold">Facturation</h1>
      </header>

      {/* ── Plan actuel ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-line bg-ink-2 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Votre plan actuel</h2>
          <StatusBadge state={state} />
        </div>

        {state.active ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-sand">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
            Plan {planLabel(state.active.plan)} actif
            {state.active.expiresAt
              ? ` jusqu'au ${DATE_FORMAT.format(state.active.expiresAt)}`
              : ""}
            . Chaque cycle est re-consenti : aucun prélèvement automatique.
          </p>
        ) : state.pending.length > 0 ? (
          <p className="mt-3 text-sm text-sand">
            Votre demande est dans la file de validation. Si le règlement est déjà parti,
            il ne reste qu&apos;à patienter — sinon, les instructions sont ci-dessous.
          </p>
        ) : state.expired ? (
          <p className="mt-3 text-sm text-sand">
            Votre dernier abonnement est arrivé à échéance. Réactivez un plan ci-dessous
            pour recomposer vos livrables.
          </p>
        ) : (
          <p className="mt-3 text-sm text-sand">
            Aucun abonnement pour le moment. Choisissez un plan ci-dessous — le paiement
            se règle via WhatsApp et s&apos;active après validation par notre équipe.
          </p>
        )}

        {inGrace && entitlement.graceEndsAt ? (
          <p className="mt-3 rounded-md bg-ink-3 px-3 py-2 text-xs text-sand">
            Période de découverte : la composition de l&apos;Oracle reste ouverte
            jusqu&apos;au {DATE_FORMAT.format(entitlement.graceEndsAt)}, sans abonnement.
          </p>
        ) : null}

        {pendingInstructions.length > 0 ? (
          <div className="mt-5 space-y-4">
            {pendingInstructions.map((instructions) => (
              <PaymentInstructions key={instructions.subscriptionId} instructions={instructions} />
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Les 2 plans ─────────────────────────────────────────────── */}
      {pricing ? (
        <section aria-label="Plans disponibles">
          <div className="grid gap-bento sm:grid-cols-2">
            {(["cockpit", "retainer"] as const).map((plan) => {
              const quote = pricing.byPlan[plan];
              const highlight = plan === "retainer";
              return (
                <div
                  key={plan}
                  className={
                    highlight
                      ? "flex flex-col rounded-lg border border-coral/50 bg-ink-2 p-6"
                      : "flex flex-col rounded-lg border border-line bg-ink-2 p-6"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-2xl font-semibold">{PLAN_LABELS[plan]}</h3>
                    <div className="flex items-center gap-2">
                      {highlight ? <Badge variant="coral">Recommandé</Badge> : null}
                      {quote.placeholder ? <Badge variant="gold">À confirmer</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-sand">{PLAN_TAGLINES[plan]}</p>
                  <p className="mt-5">
                    <span className="font-display text-3xl font-semibold">
                      {formatAmount(quote.amount, quote.currency)}
                    </span>
                    <span className="ml-1.5 text-sm text-sand">{PLAN_CADENCE_LABELS[plan]}</span>
                  </p>
                  <p className="mt-1 text-xs text-smoke-2">
                    Ajusté à votre zone ({quote.zone}) · accès {PLAN_PERIOD_DAYS[plan]} jours
                    par cycle validé
                  </p>
                  <div className="flex-1" />
                  <SubscribeButton
                    plan={plan}
                    variant={highlight ? "primary" : "outline"}
                    disabled={Boolean(state.active)}
                    hint={state.active ? "Un abonnement est déjà actif sur ce workspace." : undefined}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-smoke-2">
            Paiement via WhatsApp (mobile money accepté à la main : Wave, Orange Money, MTN
            MoMo, Moov). Validation manuelle sous 24&nbsp;h ouvrées — aucun accès n&apos;est
            ouvert avant validation, aucun prélèvement automatique.
          </p>
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-bone">Grille tarifaire indisponible.</p>
            <p className="mt-1 text-sand">
              Le référentiel pricing n&apos;est pas encore seedé en base — aucun montant
              n&apos;est affiché plutôt qu&apos;un montant inventé. ({pricingError})
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
