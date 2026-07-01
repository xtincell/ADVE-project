import type { Metadata } from "next";
import { IntakeWizard } from "./intake-wizard";

export const metadata: Metadata = {
  title: "Diagnostic gratuit",
  description:
    "Évaluez votre marque sur le socle ADVE — Authenticité, Distinction, Valeur, Engagement. Score /100, palier projeté et 3 prochaines actions. Gratuit, 15 minutes.",
};

/**
 * /intake — funnel public (WP-004). Page statique sans DB : le wizard est un
 * unique composant client, la soumission passe par une server action.
 */
export default function IntakePage() {
  return (
    <div className="bg-bone">
      <section className="texture-geo bg-ink text-bone">
        <div className="mx-auto max-w-page px-gutter py-14 sm:py-20">
          <p className="eyebrow text-coral">Diagnostic gratuit · 15 minutes</p>
          <h1 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-[1.08] sm:text-5xl">
            Où en est votre marque, <span className="text-coral">vraiment</span> ?
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sand">
            Répondez à ce que vous savez — chaque champ est optionnel. Le
            diagnostic mesure votre socle ADVE tel qu&apos;il est : score /100,
            palier projeté, forces, angles morts et 3 prochaines actions.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-page px-gutter py-12 sm:py-16">
        <IntakeWizard />
      </div>
    </div>
  );
}
