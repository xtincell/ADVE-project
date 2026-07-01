import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Eyebrow, SectionHeading, Lede, PrimaryCta, GhostCta, PageHeader } from "@/components/upgraders/ui";
import { GuildeCategories, GuildeGrid } from "@/components/upgraders/blocks";

export const metadata: Metadata = {
  title: "La Guilde — UPgraders · Le réseau de talents curatés",
  description:
    "La Guilde, le réseau UPgraders : freelances (Core), agences partenaires (Extended) et spécialistes (Réseau). Une cellule sur mesure pour chaque mission, pas une équipe figée. Déposez une mission ou rejoignez le réseau.",
};

export default function LaGuildePage() {
  return (
    <main>
      <SiteNav />
      <PageHeader
        eyebrow="Le réseau"
        title="La"
        emphasis="Guilde."
        lede="UPgraders n'a pas d'équipe figée. Pour chaque mission, on compose la cellule juste à partir de La Guilde : un réseau curaté de freelances, d'agences partenaires et de spécialistes couvrant tous les métiers de l'industrie créative."
      >
        <PrimaryCta href="/LaGuilde/publier">Déposer une mission</PrimaryCta>
        <GhostCta href="/LaGuilde/rejoindre">Rejoindre le réseau</GhostCta>
      </PageHeader>

      <Section>
        <Eyebrow num="01">Trois cercles</Eyebrow>
        <SectionHeading emphasis="concentriques">Un réseau en cercles</SectionHeading>
        <Lede className="mt-4 mb-10">
          La Guilde se structure en trois cercles. Selon le brief, on puise dans l&apos;un, dans l&apos;autre, ou on
          assemble une cellule transverse.
        </Lede>
        <GuildeCategories />
      </Section>

      <Section surface>
        <Eyebrow num="02">Le noyau dur</Eyebrow>
        <SectionHeading emphasis="visages">Quelques</SectionHeading>
        <Lede className="mt-4 mb-10">
          Le modèle ne tient que parce qu&apos;il y a un noyau qui garantit la cohérence — le binôme CEO + Friends Studio.
          Autour, le carnet d&apos;adresses se densifie cycle après cycle.
        </Lede>
        <GuildeGrid />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex flex-col border border-border bg-background p-8">
            <Eyebrow>Pour les marques</Eyebrow>
            <h3 className="font-display text-2xl font-semibold tracking-tight">Une cellule taillée pour votre ADVE</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground-secondary">
              Pas de structure à amortir : vous payez ce qui produit la valeur. Chaque mandat reçoit l&apos;équipe juste,
              castée pour son ADN de marque — le bon photographe, le bon motion designer, la bonne agence relais.
            </p>
            <div className="mt-6">
              <PrimaryCta href="/LaGuilde/publier">Déposer une mission</PrimaryCta>
            </div>
          </div>
          <div className="flex flex-col border border-border bg-background p-8">
            <Eyebrow>Pour les talents</Eyebrow>
            <h3 className="font-display text-2xl font-semibold tracking-tight">Convoqué à la mission, payé sereinement</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground-secondary">
              Freelances et agences : entrez dans le réseau curaté. Missions qualifiées, brief structuré, et la
              conciergerie Sérénité qui sécurise contrats et paiements (escrow, mobile money).
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/LaGuilde/rejoindre" className="inline-flex items-center gap-2 border border-border-strong px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated">
                Rejoindre le réseau
              </Link>
              <Link href="/LaGuilde" className="inline-flex items-center gap-2 border border-border-subtle px-5 py-3.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground">
                Voir les missions ouvertes
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
