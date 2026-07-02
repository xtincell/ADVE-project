import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { AGENCY_PILLARS, SERVICE_DOORS } from "@/components/marketing/site-data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Trois portes d'entrée chez UPgraders : Audit ADVE (2-4 semaines), Mandat RTIS (6-24 mois), Marque blanche pour agences. Cinq piliers — Impulsion, Pilotis, Source Insights, La Guilde, Sérénité — orchestrés par La Fusée.",
};

/**
 * L'offre — port de legacy/(marketing)/services : 3 portes d'entrée,
 * 5 piliers du modèle, la plateforme La Fusée (diagnostic + Oracle).
 */
export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Travailler avec nous"
        title={
          <>
            Trois portes, <span className="text-coral">une mécanique</span>.
          </>
        }
        lede="On entre par un audit, un mandat complet ou une collaboration en marque blanche. Derrière chaque porte, la même mécanique : cinq piliers orchestrés par l'OS La Fusée."
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Démarrer un projet <ArrowRight />
        </Link>
        <Link href="/tarifs" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Voir les tarifs
        </Link>
      </PageHero>

      <Section>
        <SectionHeader
          num="01"
          eyebrow="Les portes d'entrée"
          title={
            <>
              Trois niveaux <span className="text-coral">d&apos;engagement</span>
            </>
          }
        />
        <div className="mt-10 grid gap-bento lg:grid-cols-3">
          {SERVICE_DOORS.map((s) => (
            <div
              key={s.mark}
              className={`flex flex-col rounded-xl p-8 ${
                s.featured
                  ? "bg-ink text-bone shadow-card-lg"
                  : "border border-ink/10 bg-white shadow-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`font-mono text-xs font-semibold ${
                    s.featured ? "text-gold" : "text-coral"
                  }`}
                >
                  {s.mark}
                </p>
                {s.featured ? <Badge variant="coral">Formule reine</Badge> : null}
              </div>
              <h2 className="font-display mt-4 text-2xl font-semibold">{s.title}</h2>
              <p className={`eyebrow mt-1 ${s.featured ? "text-sand" : "text-smoke-2"}`}>
                {s.duration}
              </p>
              <p
                className={`mt-4 flex-1 text-sm leading-relaxed ${
                  s.featured ? "text-sand" : "text-smoke"
                }`}
              >
                {s.desc}
              </p>
              <p
                className={`mt-6 border-t pt-4 text-sm font-bold ${
                  s.featured ? "border-line" : "border-ink/8"
                }`}
              >
                {s.tag}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-smoke">
          <Link href="/tarifs" className="font-semibold text-coral hover:underline">
            ↳ Voir les tarifs
          </Link>{" "}
          — La Fusée (prix résolu par zone, mobile money) + prestations agence sur devis.
        </p>
      </Section>

      <Section tone="dark">
        <SectionHeader
          num="02"
          eyebrow="Le détail"
          tone="dark"
          title={
            <>
              Cinq <span className="text-coral">piliers</span>
            </>
          }
          lede="Chaque porte mobilise les cinq piliers dans des proportions différentes. Voici ce que chacun recouvre concrètement."
        />
        <div className="mt-8 flex flex-col">
          {AGENCY_PILLARS.map((p) => (
            <div
              key={p.mark}
              className="grid grid-cols-[40px_1fr] gap-5 border-t border-line py-7 md:grid-cols-[80px_1fr]"
            >
              <p className="font-mono text-sm font-semibold text-coral">{p.mark}</p>
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <span className="eyebrow text-smoke-2">{p.line}</span>
                </div>
                <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-sand">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              num="03"
              eyebrow="La plateforme"
              title={
                <>
                  La <span className="text-coral">Fusée</span>.
                </>
              }
              lede="Les cinq piliers ne tiennent pas par magie : ils sont orchestrés par La Fusée, notre OS. C'est lui qui transforme vos réponses en socle ADVE, dérive le propulseur RTIS, compose l'Oracle et recalcule votre score à chaque décision. Vous le pilotez depuis votre espace marque."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/methode" className={buttonVariants({ variant: "outline", size: "md" })}>
                Comprendre la méthode
              </Link>
              <Link href="/connexion" className={buttonVariants({ variant: "ghost", size: "md" })}>
                Accéder à mon espace
              </Link>
            </div>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-card">
            <p className="eyebrow text-coral">La Fusée — notre produit</p>
            <h3 className="font-display mt-2 text-xl font-semibold">
              Pas (encore) prêt pour un mandat ?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-smoke">
              Essayez La Fusée en libre-service : le diagnostic est gratuit et tombe en quinze
              minutes — un score, vos forces, vos angles morts, un premier plan d&apos;action.
              Sans engagement, c&apos;est la façon de voir la mécanique avant de parler mandat.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/intake" className={buttonVariants({ size: "md" })}>
                Diagnostic gratuit <ArrowRight />
              </Link>
              <Link href="/tarifs" className={buttonVariants({ variant: "outline", size: "md" })}>
                Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
