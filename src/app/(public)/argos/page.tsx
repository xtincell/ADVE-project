/**
 * Argos — mur public des dossiers de référence. ADR-0095.
 */

import { ArgosWall } from "@/components/argos/argos-wall";

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
            décodés pour inspirer les marques d'Afrique francophone.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-10">
        <ArgosWall />
      </div>
    </>
  );
}
