/**
 * Argos — mur public des dossiers de référence. ADR-0100.
 * Phase A état-final : fusion avec le championnat (lien classement) + capture
 * newsletter (l'audience possédée en propre).
 */

import { ArgosWall } from "@/components/argos/argos-wall";
import { NewsletterCapture } from "@/components/public/newsletter-capture";

export default function ArgosPage() {
  return (
    <>
      <section className="border-b border-border bg-background-subtle">
        <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Argos by LaFusée</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            La bibliothèque des références créatives
          </h1>
          <p className="mt-3 max-w-2xl text-foreground-secondary">
            Des dossiers de référence — DNA de marque, codes visuels, axes culturels, voix —
            décodés pour inspirer les marques d&apos;Afrique francophone.
          </p>
          <p className="mt-4 text-sm">
            <a href="/leaderboard" className="font-medium text-accent underline-offset-4 hover:underline">
              Voir le championnat des marques (force révélée /200) →
            </a>
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-10">
        <ArgosWall />
        <div className="mt-12 rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-foreground">Recevez les prochains dossiers</p>
          <p className="mb-3 mt-1 text-sm text-foreground-secondary">
            Les dossiers de la rédaction et les mouvements du classement — pas de spam.
          </p>
          <NewsletterCapture source="argos" />
        </div>
      </div>
    </>
  );
}
