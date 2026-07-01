import type { Metadata } from "next";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Eyebrow, SectionHeading, Lede, PrimaryCta, GhostCta, PageHeader } from "@/components/upgraders/ui";
import { RealisationsGrid, StatRow } from "@/components/upgraders/blocks";

export const metadata: Metadata = {
  title: "Réalisations — UPgraders · Motion19, UMA, Chococam, Orange, KOF…",
  description:
    "Les marques bâties ou propulsées par UPgraders : Motion19, Universal Music Africa, Chococam, Orange Cameroun, Cimencam, KOF, Akwa Palace, Maison Gimane, Shakazz et plus. Brand build, direction artistique, production audiovisuelle.",
};

export default function RealisationsPage() {
  return (
    <main>
      <SiteNav />
      <PageHeader
        eyebrow="Preuves"
        title="Les marques"
        emphasis="parlent."
        lede="Sept ans de missions — du brand build de bout en bout à la direction artistique, en passant par la production audiovisuelle et la marque blanche pour d'autres agences. Un échantillon de ce que le cabinet et La Guilde ont porté."
      >
        <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
        <GhostCta href="/methode">Notre méthode</GhostCta>
      </PageHeader>

      <Section>
        <Eyebrow num="01">Le portfolio</Eyebrow>
        <SectionHeading emphasis="propulsées">Bâties ou</SectionHeading>
        <Lede className="mt-4 mb-10">
          Marques créées de A à Z, comptes corporate, festivals, hôtellerie, musique, joaillerie, fintech. Selon le
          brief, UPgraders pilote la stratégie et compose la cellule — souvent en binôme avec Friends Studio.
        </Lede>
        <RealisationsGrid />
      </Section>

      <Section surface>
        <Eyebrow num="02">En chiffres</Eyebrow>
        <SectionHeading emphasis="trace">La flotte et la</SectionHeading>
        <Lede className="mt-4 mb-10">
          Notre actif défendable n&apos;est pas un créatif providentiel : c&apos;est la flotte de marques accompagnées et
          la trace qu&apos;on en garde.
        </Lede>
        <StatRow />
      </Section>

      <Section>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow num="03">La prochaine</Eyebrow>
            <SectionHeading emphasis="vôtre.">La</SectionHeading>
            <Lede className="mt-4">
              Une marque à lancer, une trajectoire à corriger, une couverture à produire ? Les agences relais et studios
              sont aussi les bienvenus — on porte la méthode, vous portez la relation client.
            </Lede>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
            <GhostCta href="/services">Voir les services</GhostCta>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
