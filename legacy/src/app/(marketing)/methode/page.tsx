import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Eyebrow, SectionHeading, Lede, PrimaryCta, GhostCta, PageHeader } from "@/components/upgraders/ui";
import { MethodCascade, EfrGrid, PaliersLadder } from "@/components/upgraders/blocks";

export const metadata: Metadata = {
  title: "Méthode ADVE/RTIS — UPgraders · L'IP qui transforme une marque en icône",
  description:
    "ADVE/RTIS, la méthode propriétaire d'UPgraders : un socle ADVE (Authenticité · Distinction · Valeur · Engagement) + un propulseur RTIS (Risk · Track · Innovation · Stratégie). Score /200, 6 paliers de maturité, obligation d'effet.",
};

const STAGES: { name: string; letters: string; desc: string }[] = [
  { name: "Booster", letters: "A · D · V · E", desc: "Le socle — l'identité de la marque. Mutable uniquement par décision opérateur." },
  { name: "Mid-stage", letters: "R · T", desc: "Risque et marché. On confronte l'identité au paysage réel. Dérivé du socle." },
  { name: "Upper-stage", letters: "I · S", desc: "Innovation et stratégie. L'éventail d'actions, hiérarchisé en roadmap dynamique." },
];

export default function MethodePage() {
  return (
    <main>
      <SiteNav />
      <PageHeader
        eyebrow="Méthode propriétaire"
        title="ADVE"
        emphasis="/RTIS"
        lede="Notre IP, formalisée sur sept ans. Une méthode en deux temps : un socle qui définit ce que la marque est, un propulseur qui la met en mouvement. Réexécutable, versionnable, automatisable — c'est exactement ce que l'OS La Fusée orchestre."
      >
        <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
        <GhostCta href="/lafusee">Découvrir La Fusée</GhostCta>
      </PageHeader>

      <Section>
        <Eyebrow num="01">Les huit lettres</Eyebrow>
        <SectionHeading emphasis="propulseur">Un socle, un</SectionHeading>
        <Lede className="mt-4 mb-10">
          Quatre lettres pour l&apos;identité, quatre pour l&apos;action. La cascade est unidirectionnelle : on ne
          propulse jamais une marque dont le socle n&apos;est pas posé.
        </Lede>
        <MethodCascade />
      </Section>

      <Section surface>
        <Eyebrow num="02">L'architecture</Eyebrow>
        <SectionHeading emphasis="étages">Trois</SectionHeading>
        <Lede className="mt-4 mb-10">
          Comme une fusée : un booster qui arrache la marque au sol, deux étages qui la mettent en orbite. Chaque étage
          ne s&apos;allume que si le précédent a tenu.
        </Lede>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STAGES.map((s, i) => (
            <div key={s.name} className="border border-border bg-background p-7">
              <div className="font-mono text-xs text-accent">Étage {i + 1}</div>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">{s.name}</h3>
              <div className="mt-1 font-mono text-sm text-foreground">{s.letters}</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <Eyebrow num="03">L'obligation d'effet</Eyebrow>
        <SectionHeading emphasis="état final mesuré.">On vend un</SectionHeading>
        <Lede className="mt-4 mb-10">
          La rupture de positionnement : l&apos;agence à obligation d&apos;effet. On ne vend pas des moyens, on vend un
          résultat tracé — palier visé, score cible, horizon, gelés à la signature dans un journal immuable.
        </Lede>
        <EfrGrid />
      </Section>

      <Section surface>
        <Eyebrow num="04">La mesure</Eyebrow>
        <SectionHeading emphasis="/200">Six paliers, un score</SectionHeading>
        <Lede className="mt-4 mb-10">
          La maturité d&apos;une marque se mesure. Chaque palier a un score cible sur 200 — la boussole partagée entre
          l&apos;agence et le client tout au long du mandat.
        </Lede>
        <PaliersLadder />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <Eyebrow num="05">Le livrable</Eyebrow>
            <SectionHeading emphasis="Oracle.">L&apos;</SectionHeading>
            <Lede className="mt-4">
              La méthode produit un document de conseil dynamique — l&apos;Oracle. Un diagnostic structuré qui se
              met à jour à chaque cycle : score, radar des piliers, plan d&apos;action priorisé. On l&apos;accouche par un
              audit ADVE en mandat — ou vous l&apos;essayez en libre-service via notre produit La Fusée.
            </Lede>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryCta href="/contact">Cadrer un audit ADVE</PrimaryCta>
              <Link href="/intake" className="inline-flex items-center gap-2 border border-border-subtle px-5 py-3.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground">
                Ou via La Fusée — diagnostic gratuit
              </Link>
            </div>
          </div>
          <div className="border border-border bg-surface-raised p-7">
            <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">Ce que contient l&apos;Oracle</div>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-foreground-secondary">
              {[
                "Le diagnostic ADVE — 4 piliers d'identité notés",
                "Le SWOT taillé dans l'ADN (pilier Risk)",
                "La lecture de marché et des signaux faibles (Track)",
                "L'éventail d'actions activables (Innovation)",
                "La roadmap dynamique priorisée (Stratégie)",
                "Le score /200 et le palier de maturité visé",
              ].map((line) => (
                <li key={line} className="flex gap-3 border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                  <span className="text-accent">→</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
