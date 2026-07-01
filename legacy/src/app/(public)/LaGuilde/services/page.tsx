/**
 * La Guilde — le mur des services (gigs prestataires). ADR-0117.
 * Browse public des offres talents avec prix indicatif.
 */

import Link from "next/link";
import { ServicesWall } from "@/components/laguilde/services-wall";

export default function LaGuildeServicesPage() {
  return (
    <>
      <section className="border-b border-border bg-background-subtle">
        <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">La Guilde · Services</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Les services des talents de la Guilde
          </h1>
          <p className="mt-3 max-w-2xl text-foreground-secondary">
            Photographes, vidéastes, designers, plumes… découvrez leurs offres avec un prix indicatif.
            Besoin sur-mesure ? Publiez plutôt une mission et laissez les talents candidater.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/LaGuilde/rejoindre"
              className="rounded-[var(--button-radius)] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Proposer mes services
            </Link>
            <Link
              href="/LaGuilde/publier"
              className="rounded-[var(--button-radius)] border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[var(--color-card-hover)]"
            >
              Publier une mission
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-10">
        <ServicesWall />
      </div>
    </>
  );
}
