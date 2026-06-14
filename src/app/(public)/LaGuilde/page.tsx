/**
 * La Guilde — le mur des missions disponibles (page d'accueil du portail). ADR-0093.
 */

import Link from "next/link";
import { MissionWall } from "@/components/laguilde/mission-wall";

export default function LaGuildePage() {
  return (
    <>
      <section className="border-b border-border bg-background-subtle">
        <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            La Guilde · La Fusée
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Le mur des missions créatives d'Afrique francophone
          </h1>
          <p className="mt-3 max-w-2xl text-foreground-secondary">
            Les marques publient leurs missions. Les freelances et agences de prod candidatent.
            La Fusée orchestre la mise en relation, le contrôle qualité et les paiements en mobile
            money.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/LaGuilde/publier"
              className="rounded-[var(--button-radius)] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Publier une mission
            </Link>
            <Link
              href="/LaGuilde/rejoindre"
              className="rounded-[var(--button-radius)] border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[var(--color-card-hover)]"
            >
              Rejoindre la Guilde
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-10">
        <MissionWall />
      </div>
    </>
  );
}
