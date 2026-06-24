import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Eyebrow, SectionHeading, Lede, PrimaryCta, GhostCta, PageHeader } from "@/components/upgraders/ui";
import { SERVICES, PILLARS } from "@/components/upgraders/data";

export const metadata: Metadata = {
  title: "Services — UPgraders · Audit ADVE, Mandat RTIS, Marque blanche",
  description:
    "Trois portes d'entrée chez UPgraders : Audit ADVE (2-4 semaines), Mandat RTIS (6-24 mois), Marque blanche pour agences. Cinq piliers — Impulsion, Pilotis, Source Insights, La Guilde, Sérénité — orchestrés par La Fusée.",
};

export default function ServicesPage() {
  return (
    <main>
      <SiteNav />
      <PageHeader
        eyebrow="Travailler avec nous"
        title="Trois portes,"
        emphasis="une mécanique."
        lede="On entre par un audit, un mandat complet ou une collaboration en marque blanche. Derrière chaque porte, la même mécanique : cinq piliers orchestrés par l'Industry OS La Fusée."
      >
        <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
        <GhostCta href="/tarifs">Voir les tarifs</GhostCta>
      </PageHeader>

      <Section>
        <Eyebrow num="01">Les portes d&apos;entrée</Eyebrow>
        <SectionHeading emphasis="d'engagement">Trois niveaux</SectionHeading>
        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.mark}
              className={`flex flex-col border bg-background p-8 ${s.featured ? "border-accent" : "border-border"}`}
            >
              {s.featured ? (
                <div className="mb-4 inline-flex w-fit items-center gap-1.5 bg-accent px-2.5 py-1 font-mono text-2xs uppercase tracking-widest text-accent-foreground">
                  Formule reine
                </div>
              ) : (
                <div className="mb-4 font-mono text-xs text-accent">{s.mark}</div>
              )}
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                {s.title}<span className="font-serif italic font-medium text-accent"> {s.emphasis}</span>
              </h3>
              <div className="mt-1 font-mono text-2xs uppercase tracking-widest text-foreground-muted">{s.duration}</div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground-secondary">{s.desc}</p>
              <div className="mt-6 border-t border-border-subtle pt-4 text-sm font-semibold text-foreground">{s.tag}</div>
            </div>
          ))}
        </div>
        <Link
          href="/tarifs"
          className="mt-6 inline-block font-mono text-2xs uppercase tracking-widest text-foreground-muted underline-offset-4 hover:text-accent hover:underline"
        >
          ↳ Voir les tarifs — La Fusée (localisé par zone, mobile money) + prestations agence sur devis
        </Link>
      </Section>

      <Section surface>
        <Eyebrow num="02">Le détail</Eyebrow>
        <SectionHeading emphasis="piliers">Cinq</SectionHeading>
        <Lede className="mt-4 mb-10">
          Chaque porte mobilise les cinq piliers dans des proportions différentes. Voici ce que chacun recouvre
          concrètement.
        </Lede>
        <div className="flex flex-col">
          {PILLARS.map((p) => (
            <div key={p.mark} className="grid grid-cols-[40px_1fr] gap-5 border-t border-border py-7 md:grid-cols-[80px_1fr]">
              <div className="font-mono text-sm text-accent">{p.mark}</div>
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-display text-xl font-semibold tracking-tight">{p.name}</h3>
                  <span className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">{p.line}</span>
                </div>
                <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-secondary">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <Eyebrow num="03">La plateforme</Eyebrow>
            <SectionHeading emphasis="Fusée.">La</SectionHeading>
            <Lede className="mt-4">
              Les cinq piliers ne tiennent pas par magie : ils sont orchestrés par La Fusée, notre Industry OS. C&apos;est
              lui qui transforme votre brief en fiche ADVE, génère le SWOT, cartographie les actions et tient la roadmap
              à jour. Côté client, vous le pilotez depuis le Cockpit.
            </Lede>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/lafusee" className="inline-flex items-center gap-2 border border-border-strong px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated">
                Découvrir l&apos;OS
              </Link>
              <Link href="/cockpit" className="inline-flex items-center gap-2 border border-border-subtle px-5 py-3.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground">
                Accéder au Cockpit
              </Link>
            </div>
          </div>
          <div className="border border-border bg-surface-raised p-8">
            <Eyebrow>La Fusée — notre produit</Eyebrow>
            <div className="font-display text-xl font-semibold tracking-tight">Pas (encore) prêt pour un mandat ?</div>
            <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
              Essayez La Fusée en libre-service : le diagnostic est gratuit et tombe en quinze minutes — un score sur
              200, un radar de vos piliers, un premier plan d&apos;action. Sans engagement, c&apos;est la façon de voir la
              mécanique avant de parler mandat.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryCta href="/intake">Diagnostic gratuit</PrimaryCta>
              <Link href="/lafusee" className="inline-flex items-center gap-2 border border-border-subtle px-5 py-3.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground">
                Découvrir l&apos;OS
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
