/**
 * /tarifs — catalogue tarifaire UPgraders (chrome UPgraders : SiteNav + SiteFooter).
 *
 * Le SET PRODUIT propre à l'agence : le produit self-serve La Fusée (qui renvoie
 * vers SON univers de prix /pricing) + les prestations agence sur devis (Audit
 * ADVE, Mandat RTIS, Marque blanche). NE PAS re-mélanger avec la grille La Fusée
 * (<PricingGrid> sur /pricing) — deux univers distincts. Server component.
 */
import type { Metadata } from "next";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Eyebrow, SectionHeading, Lede, PageHeader, PrimaryCta, GhostCta } from "@/components/upgraders/ui";
import { ProductCatalog } from "@/components/upgraders/product-catalog";

export const metadata: Metadata = {
  title: "Tarifs — UPgraders · La Fusée, Audit ADVE, Mandat RTIS, Marque blanche",
  description:
    "La gamme UPgraders : le produit self-serve La Fusée (prix dédiés, localisés par zone) et les prestations agence sur devis — Audit ADVE, Mandat RTIS, Marque blanche.",
};

export default function TarifsPage() {
  return (
    <main>
      <SiteNav />

      <PageHeader
        eyebrow="Tarifs"
        title="Une gamme,"
        emphasis="deux logiques."
        lede="UPgraders vend un produit et des prestations. La Fusée — l'Industry OS self-serve — a son propre univers de prix, localisé par zone. Les prestations agence (audit, mandat, marque blanche) sont cadrées sur devis : on ne vend pas des moyens, on gèle un état final mesuré."
      >
        <PrimaryCta href="/pricing">Tarifs La Fusée</PrimaryCta>
        <GhostCta href="/contact">Parler à l&apos;agence</GhostCta>
      </PageHeader>

      <Section>
        <Eyebrow num="01">La gamme</Eyebrow>
        <SectionHeading emphasis="produits">Nos</SectionHeading>
        <div className="mt-10">
          <ProductCatalog />
        </div>
        <p className="mt-8 font-mono text-2xs uppercase tracking-widest text-foreground-muted">
          ↳ La Fusée : prix résolus par zone (FCFA · mobile money), jamais une grille statique. Diagnostic d&apos;entrée gratuit.
        </p>
      </Section>

      <Section surface>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <Eyebrow num="02">Le produit</Eyebrow>
            <SectionHeading emphasis="Fusée.">La</SectionHeading>
            <Lede className="mt-4">
              Parmi nos offres, un produit se pilote seul : La Fusée. Diagnostic gratuit en quinze minutes,
              puis Oracle à l&apos;acte, Cockpit et Retainers en abonnement — chaque palier a un prix clair,
              recalculé pour votre marché. La porte d&apos;entrée sans engagement vers la méthode.
            </Lede>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryCta href="/pricing">Voir les tarifs La Fusée</PrimaryCta>
              <GhostCta href="/lafusee">Découvrir l&apos;OS</GhostCta>
            </div>
          </div>
          <div>
            <Eyebrow num="03">Les prestations</Eyebrow>
            <SectionHeading emphasis="devis.">Sur</SectionHeading>
            <Lede className="mt-4">
              Audit ADVE, Mandat RTIS, Marque blanche : chaque engagement agence est cadré sur mesure.
              Le périmètre, le palier visé et le score cible sont gelés et tracés à la signature —
              l&apos;obligation d&apos;effet, pas la facturation de moyens.
            </Lede>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryCta href="/contact">Demander un devis</PrimaryCta>
              <GhostCta href="/services">Le détail des prestations</GhostCta>
            </div>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
