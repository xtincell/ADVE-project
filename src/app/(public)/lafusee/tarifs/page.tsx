import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Smartphone, TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPlanPricing,
  PLAN_CADENCE_LABELS,
  PLAN_LABELS,
  type PlanKey,
  type PlanPricing,
} from "@/server/market";

// Montants relus dans ZoneIndex à CHAQUE requête — jamais figés au build
// (le build reste vert sans DATABASE_URL, doctrine v7).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tarifs — La Fusée",
  description:
    "Les plans La Fusée : Cockpit mensuel et Retainer trimestriel — prix en FCFA résolus par zone (référentiel ZoneIndex), paiement mobile money (Wave, Orange Money, MTN MoMo, Moov) ou WhatsApp. Le diagnostic ADVE reste gratuit.",
};

/**
 * /lafusee/tarifs — la grille PRODUIT (WP-025, contenu déplacé de /tarifs).
 * Les MONTANTS viennent du référentiel `ZoneIndex` famille "pricing" via
 * `getPlanPricing` (zone de repli UEMOA pour le visiteur anonyme — le prix
 * exact est résolu pour SA zone à la souscription) ; seuls le descriptif des
 * plans et la copy paiement sont statiques. Référentiel injoignable →
 * l'absence est dite, aucun montant de secours en dur (règle n°6).
 */

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

/** Montant affichable — les francs CFA (XOF/XAF) se disent « FCFA ». */
function formatAmount(amount: number, currency: string): string {
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  return `${NUMBER_FORMAT.format(amount)} ${unit}`;
}

/** Copy statique des plans — les montants, eux, viennent de la base. */
const PLAN_COPY: Record<
  PlanKey,
  { tagline: string; features: string[]; highlight: boolean }
> = {
  cockpit: {
    tagline: "Pilotez votre marque vous-même.",
    highlight: false,
    features: [
      "Diagnostic ADVE complet + score sur 100",
      "L'Oracle : votre stratégie en 35 sections",
      "Piliers éditables, score recalculé à chaque modification",
      "Livrables régénérés en illimité",
      "Historique des versions de votre marque",
      "Radar sectoriel",
    ],
  },
  retainer: {
    tagline: "UPgraders aux commandes, avec vous.",
    highlight: true,
    features: [
      "Tout le Cockpit",
      "Recommandations stratégiques continues",
      "Rapport mensuel de valeur (PDF)",
      "Veille sectorielle et signaux faibles",
      "Accompagnement consultatif par l'équipe",
      "Support prioritaire",
    ],
  },
};

const PLAN_ORDER: readonly PlanKey[] = ["cockpit", "retainer"];

export default async function LaFuseeTarifsPage() {
  // Référentiel relu à la requête — l'échec (base injoignable / non seedée)
  // est un état affiché honnêtement, jamais compensé par un montant en dur.
  let pricing: PlanPricing | null = null;
  try {
    pricing = await getPlanPricing();
  } catch {
    pricing = null;
  }

  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">La Fusée · tarifs</p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Un prix qui respecte <span className="text-coral">votre marché</span>.
          </h1>
          <p className="mt-5 text-lg text-graphite">
            Les montants sont résolus selon votre zone (indice économique + devise
            locale) — jamais une grille statique pensée pour un autre continent. Le
            diagnostic ADVE, lui,{" "}
            <Link href="/intake" className="font-semibold text-coral hover:underline">
              reste gratuit
            </Link>
            .
          </p>
        </div>

        {pricing === null ? (
          <div className="mt-10 flex max-w-4xl items-start gap-3 rounded-xl border border-ink/10 bg-white p-6 shadow-card">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden="true" />
            <div className="text-sm text-graphite">
              <p className="font-bold text-ink">Grille tarifaire momentanément indisponible.</p>
              <p className="mt-1">
                Le référentiel de prix n&apos;a pas pu être relu — aucun montant n&apos;est
                affiché plutôt qu&apos;un montant inventé. Réessayez plus tard, ou{" "}
                <a
                  href="https://wa.me/237694171799"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-coral hover:underline"
                >
                  demandez la grille sur WhatsApp
                </a>
                .
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:max-w-4xl">
          {PLAN_ORDER.map((plan) => {
            const copy = PLAN_COPY[plan];
            const quote = pricing?.byPlan[plan] ?? null;
            return (
              <div
                key={plan}
                className={`flex flex-col rounded-xl p-8 ${
                  copy.highlight
                    ? "bg-ink text-bone shadow-card-lg"
                    : "border border-ink/10 bg-white text-ink shadow-card"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold">{PLAN_LABELS[plan]}</h2>
                  <div className="flex items-center gap-2">
                    {copy.highlight ? <Badge variant="coral">Recommandé</Badge> : null}
                    {quote?.placeholder ? <Badge variant="gold">À confirmer</Badge> : null}
                  </div>
                </div>
                <p className={`mt-1 text-sm ${copy.highlight ? "text-sand" : "text-smoke"}`}>
                  {copy.tagline}
                </p>
                {quote ? (
                  <>
                    <p className="mt-6">
                      <span className="font-display text-4xl font-semibold">
                        {formatAmount(quote.amount, quote.currency)}
                      </span>
                      <span
                        className={`ml-1 text-sm ${copy.highlight ? "text-sand" : "text-smoke"}`}
                      >
                        {PLAN_CADENCE_LABELS[plan]}
                      </span>
                    </p>
                    <p className={`mt-1 text-xs ${copy.highlight ? "text-sand" : "text-smoke"}`}>
                      zone {quote.zone} — prix ajusté à votre zone à la souscription
                    </p>
                  </>
                ) : (
                  <p className={`mt-6 text-sm ${copy.highlight ? "text-sand" : "text-smoke"}`}>
                    Montant momentanément indisponible — le référentiel fait foi.
                  </p>
                )}
                <ul className="mt-7 flex-1 space-y-3 text-sm">
                  {copy.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-coral"
                        aria-hidden="true"
                      />
                      <span className={copy.highlight ? "text-sand-2" : "text-graphite"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/intake"
                  className={`${buttonVariants({
                    variant: copy.highlight ? "primary" : "outline",
                    size: "lg",
                  })} mt-8 w-full`}
                >
                  Commencer — diagnostic gratuit <ArrowRight />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 max-w-4xl space-y-3 text-sm text-smoke">
          <p>
            <strong className="text-graphite">Comment se passe le paiement ?</strong>{" "}
            Mobile money (Wave, Orange Money, MTN MoMo, Moov) ou règlement via WhatsApp.
            Chaque paiement est{" "}
            <strong className="text-graphite">
              validé manuellement par notre équipe sous 24&nbsp;h ouvrées
            </strong>{" "}
            — votre accès s&apos;ouvre à la validation, pas avant. Pas de prélèvement
            automatique silencieux : chaque cycle est re-consenti.
          </p>
          <p>
            <Smartphone className="mr-1.5 inline size-4 align-[-2px] text-coral" aria-hidden="true" />
            Déjà client ? La souscription se règle depuis votre espace :{" "}
            <Link href="/app/facturation" className="font-semibold text-coral hover:underline">
              Compte → Facturation
            </Link>
            .
          </p>
          <p>
            Besoin d&apos;un dispositif sur mesure (multi-marques, réseau de distribution,
            grands comptes) — ou d&apos;une prestation d&apos;agence (audit ADVE, mandat
            RTIS, marque blanche) ? C&apos;est{" "}
            <strong className="text-graphite">sur devis</strong> —{" "}
            <a
              href="https://wa.me/237694171799"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-coral hover:underline"
            >
              parlez-nous sur WhatsApp
            </a>
            .
          </p>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ink p-7 text-bone">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Pas encore prêt ? Commencez par le diagnostic.
            </h2>
            <p className="mt-1 text-sm text-sand">Gratuit, 15 minutes, sans carte bancaire.</p>
          </div>
          <Link href="/intake" className={buttonVariants({ size: "md" })}>
            Diagnostic gratuit <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}
