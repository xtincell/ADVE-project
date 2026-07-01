import type { Metadata } from "next";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Eyebrow, SectionHeading, Lede, PrimaryCta, GhostCta, PageHeader } from "@/components/upgraders/ui";
import { TeamGrid, Timeline, StatRow } from "@/components/upgraders/blocks";

export const metadata: Metadata = {
  title: "L'agence — UPgraders · Cabinet de conseil & stratégie depuis 2017",
  description:
    "UPgraders, cabinet de conseil & stratégie fondé en 2017 à Douala. De l'agence digitale à l'industrialisation de la production de marques. Équipe, trajectoire, positionnement premium curated.",
};

const VALUES: { title: string; desc: string }[] = [
  { title: "Premium curated", desc: "On ne fait pas du volume. Chaque mission est castée à la main, chaque livrable engage la signature du cabinet. Le contraire d'une marketplace low-cost." },
  { title: "Capture-then-grow", desc: "On vise les forts potentiels à faible pouvoir d'achat — l'ambition, pas la fortune — et on grandit avec eux. La Fusée capture l'ambition." },
  { title: "Le modèle est la marque", desc: "Sept ans à codifier une méthode et à construire un OS. L'actif n'est pas un créatif providentiel : c'est la flotte de marques et la trace qu'on en garde." },
  { title: "Local par conception", desc: "Afrique francophone, mobile-first, FCFA et mobile money. On ne plaque pas un playbook new-yorkais sur Douala ou Abidjan." },
];

export default function AgencePage() {
  return (
    <main>
      <SiteNav />
      <PageHeader
        eyebrow="Qui sommes-nous"
        title="UPgraders, l'usine à"
        emphasis="marques cultes."
        lede="Cabinet de conseil & stratégie fondé en 2017 à Douala. Nous avons commencé en agence de marketing digital, puis pivoté en conciergerie créative, pour devenir l'agence qui industrialise la production de marques en Afrique francophone."
      >
        <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
        <GhostCta href="/realisations">Voir nos réalisations</GhostCta>
      </PageHeader>

      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <Eyebrow num="01">Le récit fondateur</Eyebrow>
            <SectionHeading emphasis="poussière à l'étoile.">De la</SectionHeading>
          </div>
          <div className="flex flex-col gap-4 text-foreground-secondary" style={{ fontSize: "var(--text-lg)", lineHeight: 1.55 }}>
            <p>
              UPgraders naît en 2017 sous l&apos;impulsion d&apos;Ingrid Nya Ngatchou et Jean-Philippe Veigne. Très vite,
              un constat : sur nos marchés, le branding souffre d&apos;un <strong className="text-foreground">double
              déficit</strong> — la confiance entre entreprises et talents locaux, et les compétences structurantes
              côté talents.
            </p>
            <p>
              La réponse n&apos;est pas un créatif providentiel de plus. C&apos;est une{" "}
              <strong className="text-foreground">méthode codifiée</strong> (ADVE/RTIS), un{" "}
              <strong className="text-foreground">réseau curaté</strong> (La Guilde) et un{" "}
              <strong className="text-foreground">OS propriétaire</strong> (La Fusée) pour rendre l&apos;excellence
              reproductible. Le modèle devient la marque.
            </p>
            <p>
              En 2025, Alexandre « Xtincell » Djengue — stratège, photographe, vidéaste et designer — prend le relais
              comme CEO, ses co-fondateurs restant en éminences. Devise de la maison :{" "}
              <em className="text-foreground">« De la poussière à l&apos;étoile. »</em>
            </p>
          </div>
        </div>
      </Section>

      <Section surface>
        <Eyebrow num="02">La direction</Eyebrow>
        <SectionHeading emphasis="UPgraders">L&apos;équipe derrière</SectionHeading>
        <Lede className="mt-4 mb-10">
          Une histoire de passage de relais. La direction n&apos;est jamais déconnectée du métier — le CEO opère aussi
          sur le terrain quand le brief le demande.
        </Lede>
        <TeamGrid />
      </Section>

      <Section>
        <Eyebrow num="03">Ce qui nous tient</Eyebrow>
        <SectionHeading emphasis="convictions">Quatre</SectionHeading>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {VALUES.map((v, i) => (
            <div key={v.title} className="border border-border bg-background p-7">
              <div className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{v.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section surface>
        <Eyebrow num="04">Depuis 2017</Eyebrow>
        <SectionHeading emphasis="2026">La trajectoire — 2017 →</SectionHeading>
        <div className="mt-10">
          <Timeline />
        </div>
        <div className="mt-12">
          <StatRow />
        </div>
      </Section>

      <Section>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow num="05">Le marché</Eyebrow>
            <SectionHeading emphasis="francophone.">Afrique</SectionHeading>
            <Lede className="mt-4">
              UEMOA, CEMAC et diaspora. Mobile-first, FCFA et mobile money (Wave, Orange, MTN, Moov). Notre client
              ultime n&apos;est pas une marque — c&apos;est l&apos;industrie créative africaine francophone elle-même.
            </Lede>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <PrimaryCta href="/services">Voir les services</PrimaryCta>
            <GhostCta href="/realisations">Nos réalisations</GhostCta>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
