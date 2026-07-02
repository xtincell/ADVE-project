import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, Palette, Compass, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * /argos — teaser une page. Positionnement repris fidèlement du legacy
 * (legacy/(public)/argos : « Argos by LaFusée — la bibliothèque des références
 * créatives : des dossiers de référence — DNA de marque, codes visuels, axes
 * culturels, voix — décodés pour inspirer les marques d'Afrique francophone »).
 * Le mur de dossiers arrive avec le port du backend Argos ; en attendant,
 * l'état est dit honnêtement : en préparation, zéro dossier simulé.
 */

export const metadata: Metadata = {
  title: "Argos — l'observatoire des références",
  description:
    "Argos by La Fusée — la bibliothèque des références créatives : ADN de marque, codes visuels, axes culturels et voix, décodés pour inspirer les marques d'Afrique francophone. En préparation.",
};

const DOSSIER_FACETS = [
  {
    icon: <Eye aria-hidden="true" />,
    name: "ADN de marque",
    desc: "Ce qui fait tenir la référence : positionnement, tension, promesse.",
  },
  {
    icon: <Palette aria-hidden="true" />,
    name: "Codes visuels",
    desc: "Palette, typographies, motifs — les signatures qui la rendent reconnaissable.",
  },
  {
    icon: <Compass aria-hidden="true" />,
    name: "Axes culturels",
    desc: "La fenêtre qu'elle déplace dans son secteur, et comment.",
  },
  {
    icon: <MessageSquare aria-hidden="true" />,
    name: "Voix",
    desc: "Le ton, les phrases-clés, la manière de parler à ses superfans.",
  },
] as const;

export default function ArgosPage() {
  return (
    <>
      <section className="texture-geo bg-ink text-bone">
        <div className="mx-auto max-w-page px-gutter py-20 sm:py-28">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow text-coral">Argos by La Fusée</p>
            <Badge variant="gold">En préparation</Badge>
          </div>
          <h1 className="font-display mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            La bibliothèque des références créatives.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sand">
            Des dossiers de référence — ADN de marque, codes visuels, axes culturels, voix —
            décodés pour inspirer les marques d&apos;Afrique francophone. Un observatoire éditorial,
            pas un moodboard : chaque dossier explique <em>pourquoi</em> une référence marche.
          </p>
        </div>
      </section>

      <section className="bg-bone">
        <div className="mx-auto max-w-page px-gutter py-14 sm:py-16">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Ce que contiendra un dossier
          </h2>
          <div className="mt-8 grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
            {DOSSIER_FACETS.map((f) => (
              <div
                key={f.name}
                className="rounded-lg border border-ink/10 bg-white p-6 shadow-card"
              >
                <span className="text-coral [&_svg]:size-6">{f.icon}</span>
                <h3 className="font-display mt-3 text-lg font-semibold text-ink">{f.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-smoke">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <EmptyState
              tone="light"
              title="Aucun dossier publié pour l'instant"
              description="Argos est en préparation — le mur des références ouvrira ici, avec de vrais dossiers décodés, jamais du remplissage."
            />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ink p-7 text-bone">
            <div>
              <h2 className="font-display text-xl font-semibold">
                En attendant, mesurez votre propre marque.
              </h2>
              <p className="mt-1 text-sm text-sand">
                Le diagnostic ADVE est gratuit — 15 minutes, score sur 100.
              </p>
            </div>
            <Link href="/intake" className={buttonVariants({ size: "md" })}>
              Diagnostic gratuit <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
