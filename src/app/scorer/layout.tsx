import type { Metadata } from "next";

/**
 * Metadata du /scorer (audit DS/oubliés 2026-07-19, B6) — la surface la plus
 * partageable du funnel n'émettait que le titre/OG génériques du root (la page
 * est un client component, incapable d'exporter `metadata`).
 */
export const metadata: Metadata = {
  title: "Scorez votre marque en 1 minute — gratuit, sans email",
  description:
    "Entrez votre marque, votre site et vos réseaux : on mesure votre empreinte digitale publique en une minute — audiences, presse, avis, domaine. Rien n'est inventé.",
  openGraph: {
    title: "Scorez votre marque en 1 minute — La Fusée",
    description:
      "Votre empreinte digitale publique, mesurée en une minute. Gratuit, sans email — puis votre place au classement des marques.",
  },
};

export default function ScorerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
