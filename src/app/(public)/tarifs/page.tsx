import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Smartphone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Cockpit mensuel et Retainer trimestriel — prix en FCFA ajustés à votre zone, paiement mobile money (Wave, Orange Money, MTN MoMo, Moov) ou WhatsApp.",
};

/**
 * Grille publique — 2 plans. Montants = ordres de grandeur réels issus du
 * moteur déterministe legacy (tiers SPU × facteur de zone plancher 0.30 ×
 * FX EUR→FCFA, arrondi au millier — cf. legacy/services/monetization/) pour
 * la zone Cameroun/UEMOA. Le prix exact est résolu par zone au moment du
 * devis (WP-007) — jamais une grille statique.
 */
const PLANS = [
  {
    key: "cockpit",
    name: "Cockpit",
    tagline: "Pilotez votre marque vous-même.",
    price: "8 000 FCFA",
    cadence: "/ mois",
    priceNote: "à partir de — prix ajusté à votre zone",
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
  {
    key: "retainer",
    name: "Retainer",
    tagline: "UPgraders aux commandes, avec vous.",
    price: "177 000 FCFA",
    cadence: "/ trimestre",
    priceNote: "à partir de — soit ~59 000 FCFA/mois, ajusté à votre zone",
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
] as const;

export default function TarifsPage() {
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">Tarifs</p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Un prix qui respecte <span className="text-coral">votre marché</span>.
          </h1>
          <p className="mt-5 text-lg text-graphite">
            Les montants sont résolus selon votre zone (indice économique +
            devise locale) — jamais une grille statique pensée pour un autre
            continent. Le diagnostic ADVE, lui,{" "}
            <Link href="/intake" className="font-semibold text-coral hover:underline">
              reste gratuit
            </Link>
            .
          </p>
        </div>

        <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:max-w-4xl">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`flex flex-col rounded-xl p-8 ${
                plan.highlight
                  ? "bg-ink text-bone shadow-card-lg"
                  : "border border-ink/10 bg-white text-ink shadow-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                {plan.highlight && <Badge variant="coral">Recommandé</Badge>}
              </div>
              <p className={`mt-1 text-sm ${plan.highlight ? "text-sand" : "text-smoke"}`}>
                {plan.tagline}
              </p>
              <p className="mt-6">
                <span className="font-display text-4xl font-semibold">{plan.price}</span>
                <span className={`ml-1 text-sm ${plan.highlight ? "text-sand" : "text-smoke"}`}>
                  {plan.cadence}
                </span>
              </p>
              <p className={`mt-1 text-xs ${plan.highlight ? "text-sand" : "text-smoke"}`}>
                {plan.priceNote}
              </p>
              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
                    <span className={plan.highlight ? "text-sand-2" : "text-graphite"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/app/facturation"
                className={`${buttonVariants({
                  variant: plan.highlight ? "primary" : "outline",
                  size: "lg",
                })} mt-8 w-full`}
              >
                <Smartphone /> Payer via Mobile Money / WhatsApp
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-4xl space-y-3 text-sm text-smoke">
          <p>
            <strong className="text-graphite">Comment se passe le paiement ?</strong>{" "}
            Mobile money (Wave, Orange Money, MTN MoMo, Moov) ou règlement via
            WhatsApp. Chaque paiement est <strong className="text-graphite">validé
            manuellement par notre équipe sous 24&nbsp;h ouvrées</strong> — votre
            accès s&apos;ouvre à la validation, pas avant. Pas de prélèvement
            automatique silencieux : chaque cycle est re-consenti.
          </p>
          <p>
            Besoin d&apos;un dispositif sur mesure (multi-marques, réseau de
            distribution, grands comptes) ? C&apos;est{" "}
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
            <p className="mt-1 text-sm text-sand">
              Gratuit, 15 minutes, sans carte bancaire.
            </p>
          </div>
          <Link href="/intake" className={buttonVariants({ size: "md" })}>
            Diagnostic gratuit <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}
