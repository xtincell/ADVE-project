import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * /changelog — journal produit public. Le legacy générait la page depuis
 * `git log` ; en v7 le changelog est éditorial : des jalons produit lisibles
 * par un client, pas des commits. Contenu statique, mis à jour à chaque
 * évolution notable (engagement pris dans les CGU art. 5).
 */

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Les évolutions publiques de La Fusée — jalons produit, par ordre chronologique inverse.",
};

type Release = {
  version: string;
  date: string;
  title: string;
  summary: string;
  items: string[];
  upcoming: string[];
};

const RELEASES: Release[] = [
  {
    version: "v7.0",
    date: "Juillet 2026",
    title: "Reconstruction",
    summary:
      "La Fusée est reconstruite de zéro sur un socle plus simple et plus fiable : " +
      "déterminisme d'abord, traçabilité hash-chaînée, zéro donnée inventée.",
    items: [
      "Diagnostic ADVE gratuit en ligne : 15 minutes, score sur 100, sans carte bancaire.",
      "Cockpit de marque : 8 piliers A→S éditables champ par champ, révisions versionnées, score recalculé à chaque modification.",
      "L'Oracle : la stratégie complète de votre marque, composée depuis vos piliers, lisible en ligne et imprimable.",
      "Facturation en FCFA : mobile money (Wave, Orange Money, MTN MoMo, Moov) réglé via WhatsApp, validation sous 24 h ouvrées, 15 jours de grâce découverte.",
      "Assistance IA optionnelle : des brouillons de piliers marqués « à valider » — jamais d'écriture automatique sur votre noyau.",
      "Pages légales et de confiance : CGU, CGV, SLA, DPA, confidentialité, Trust Center, état de la plateforme en direct.",
    ],
    upcoming: [
      "Campagnes & missions : du diagnostic à l'exécution pilotée.",
      "La Guilde : le réseau de talents, mur des missions public et candidatures.",
      "Argos : l'observatoire des références créatives (teaser sur /argos).",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-3xl px-gutter py-16 sm:py-20">
        <p className="eyebrow text-coral">Journal</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-ink">
          Changelog
        </h1>
        <p className="mt-4 text-graphite">
          Les évolutions publiques du produit, par ordre chronologique inverse. Les changements
          notables sont publiés ici — c&apos;est un engagement des{" "}
          <Link href="/cgu" className="font-medium text-coral hover:underline">
            CGU (art. 5)
          </Link>
          .
        </p>

        <div className="mt-12 space-y-10">
          {RELEASES.map((r) => (
            <article
              key={r.version}
              className="rounded-lg border border-ink/10 bg-white p-7 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {r.version} — {r.title}
                </h2>
                <Badge variant="coral">{r.date}</Badge>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-graphite">{r.summary}</p>

              <ul className="mt-5 space-y-2.5 text-sm text-graphite">
                {r.items.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {r.upcoming.length > 0 && (
                <div className="mt-6 border-t border-ink/10 pt-5">
                  <p className="eyebrow text-smoke">À venir</p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-smoke">
                    {r.upcoming.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-smoke">
          État de la plateforme en direct :{" "}
          <Link href="/status" className="font-medium text-coral hover:underline">
            /status
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
