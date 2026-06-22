import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Shell, Eyebrow, SectionHeading, Lede, PrimaryCta, GhostCta } from "@/components/upgraders/ui";
import {
  PillarsGrid,
  MethodCascade,
  EfrGrid,
  GuildeCategories,
  RealisationsGrid,
  Timeline,
  StatRow,
  PostCard,
} from "@/components/upgraders/blocks";
import { IDENTITY, CLIENT_STRIP, PILLARS } from "@/components/upgraders/data";
import { getAllPosts } from "@/components/upgraders/posts";

export const metadata: Metadata = {
  title: "UPgraders — Cabinet de conseil & stratégie · La passion pour propulseur",
  description:
    "UPgraders industrialise la production de marques en Afrique francophone. Conseil stratégique (ADVE/RTIS), réseau de talents curatés (La Guilde) et l'Industry OS La Fusée. Depuis 2017, Douala · Abidjan.",
};

function Hero() {
  return (
    <header className="relative overflow-hidden pt-28 pb-16 md:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at 50% 20%, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 85% 0%, color-mix(in oklab, var(--color-accent) 16%, transparent), transparent 55%), radial-gradient(ellipse at 0% 90%, color-mix(in oklab, var(--color-accent) 8%, transparent), transparent 50%)",
        }}
      />

      <Shell className="relative">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-subtle pb-4 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success" />Cabinet de conseil &amp; stratégie</span>
          <span className="text-accent">·</span>
          <span>Depuis 2017</span>
          <span className="text-accent">·</span>
          <span>Douala · Abidjan</span>
          <span className="text-accent">·</span>
          <span>IP — Méthode ADVE/RTIS</span>
        </div>

        <div className="grid grid-cols-1 gap-12 pt-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16 lg:pt-16">
          <div>
            <Eyebrow>UPgraders — l&apos;agence</Eyebrow>
            <h1 className="font-display font-semibold tracking-tighter" style={{ fontSize: "var(--text-mega)", lineHeight: 0.95 }}>
              La passion<br />
              pour{" "}
              <span className="relative inline-block">
                <span className="font-serif italic font-medium text-accent">propulseur</span>
                <span className="absolute inset-x-[-2%] bottom-1 -z-10 h-[0.14em] bg-accent" style={{ transform: "skewX(-12deg)" }} aria-hidden="true" />
              </span>
              .
            </h1>
            <Lede className="mt-8">
              UPgraders <strong className="text-foreground">industrialise la production de marques</strong> en Afrique
              francophone. Un cabinet de conseil &amp; stratégie qui orchestre un réseau de freelances et d&apos;agences
              partenaires pour transformer des marques en <strong className="text-foreground">phénomènes culturels</strong>.
            </Lede>

            <div className="mt-9 flex flex-wrap gap-3">
              <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
              <GhostCta href="/methode">Découvrir la méthode</GhostCta>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 border border-border-subtle px-5 py-3.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground"
              >
                Nos services
              </Link>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
              ↳ réponse sous 24 h · WhatsApp · Douala · Abidjan
            </p>
            <p className="mt-4 border-t border-dashed border-border-subtle pt-4 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
              La Fusée — notre OS produit
              <Link href="/intake" className="ml-2 text-foreground-secondary transition-colors hover:text-accent">→ Diagnostic gratuit</Link>
              <Link href="/lafusee" className="ml-2 text-foreground-secondary transition-colors hover:text-accent">→ Découvrir l&apos;OS</Link>
            </p>
          </div>

          <aside className="self-end border border-border bg-surface-raised/70 backdrop-blur-sm">
            <header className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-foreground-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Ce qu&apos;on industrialise
            </header>
            <ul className="font-mono text-xs">
              {PILLARS.map((p) => (
                <li key={p.mark} className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 last:border-0">
                  <span className="text-foreground-muted">{p.mark}</span>
                  <span className="flex-1 px-3 text-foreground">{p.name}</span>
                  <span className="text-right text-[10px] uppercase tracking-widest text-foreground-muted">{p.line}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Shell>
    </header>
  );
}

function ClientsStrip() {
  return (
    <div className="border-y border-border-subtle bg-surface-raised py-7">
      <Shell>
        <div className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          Des marques bâties ou propulsées par le cabinet
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {CLIENT_STRIP.map((name) => (
            <span key={name} className="font-display text-base font-medium text-foreground-secondary">
              {name}
            </span>
          ))}
        </div>
      </Shell>
    </div>
  );
}

export default function UpgradersHomePage() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <main>
      <SiteNav />
      <Hero />
      <ClientsStrip />

      <Section id="modele">
        <Eyebrow num="01">Le modèle</Eyebrow>
        <SectionHeading emphasis="piliers">Cinq</SectionHeading>
        <Lede className="mt-4 mb-10">
          UPgraders n&apos;est pas une agence créative de plus. C&apos;est une mécanique en cinq piliers — du conseil à la
          conciergerie financière — orchestrée par un Industry OS propriétaire.
        </Lede>
        <PillarsGrid />
      </Section>

      <Section surface>
        <Eyebrow num="02">Méthode propriétaire</Eyebrow>
        <SectionHeading emphasis="/RTIS">ADVE</SectionHeading>
        <Lede className="mt-4 mb-10">
          Notre IP, formalisée sur sept ans. Un <strong className="text-foreground">socle</strong> qui définit
          l&apos;identité de la marque, un <strong className="text-foreground">propulseur</strong> qui la met en mouvement.
          Réexécutable, versionnable, automatisable — c&apos;est ce qui permet à La Fusée de tourner.
        </Lede>
        <MethodCascade />
        <div className="mt-8">
          <Link href="/methode" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground-secondary transition-colors hover:text-accent">
            La méthode en détail →
          </Link>
        </div>
      </Section>

      <Section id="effet">
        <Eyebrow num="03">Le repositionnement</Eyebrow>
        <SectionHeading emphasis="d'effet">Une agence à obligation</SectionHeading>
        <Lede className="mt-4 mb-10">
          On ne vend pas des livrables au poids. On vend un <strong className="text-foreground">état final mesuré</strong> :
          un palier de maturité visé, un score cible sur 200, un horizon. Gelés et tracés à la signature.
        </Lede>
        <EfrGrid />
      </Section>

      <Section surface>
        <Eyebrow num="04">Le réseau</Eyebrow>
        <SectionHeading emphasis="Guilde">La</SectionHeading>
        <Lede className="mt-4 mb-10">
          Pas d&apos;équipe figée — une cellule composée pour chaque mission à partir de La Guilde : freelances, agences
          partenaires et spécialistes curatés, couvrant tous les métiers de l&apos;industrie créative.
        </Lede>
        <GuildeCategories />
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/la-guilde" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground-secondary transition-colors hover:text-accent">
            Découvrir le réseau →
          </Link>
          <Link href="/LaGuilde" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground-secondary transition-colors hover:text-accent">
            Rejoindre la marketplace →
          </Link>
        </div>
      </Section>

      <Section id="realisations">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow num="05">Preuves</Eyebrow>
            <SectionHeading emphasis="parlent">Les marques</SectionHeading>
          </div>
          <Link href="/realisations" className="font-mono text-[11px] uppercase tracking-widest text-foreground-secondary transition-colors hover:text-accent">
            Toutes les réalisations →
          </Link>
        </div>
        <div className="mt-10">
          <RealisationsGrid limit={6} />
        </div>
        <div className="mt-10">
          <StatRow />
        </div>
      </Section>

      <Section surface>
        <Eyebrow num="06">Depuis 2017</Eyebrow>
        <SectionHeading emphasis="relais">Une histoire de passage de</SectionHeading>
        <Lede className="mt-4 mb-10">
          UPgraders est née en 2017 d&apos;une vision partagée. Aujourd&apos;hui Alexandre Djengue en porte la suite, avec
          ses co-fondateurs en éminences toujours présentes.
        </Lede>
        <Timeline />
      </Section>

      <Section id="blog">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow num="07">Notes de cabinet</Eyebrow>
            <SectionHeading emphasis="blog">Le</SectionHeading>
          </div>
          <Link href="/blog" className="font-mono text-[11px] uppercase tracking-widest text-foreground-secondary transition-colors hover:text-accent">
            Tous les articles →
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>

      <Section surface divide>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow num="08">Travailler avec nous</Eyebrow>
            <SectionHeading emphasis="poussière à l'étoile.">De la</SectionHeading>
            <Lede className="mt-4">
              Une marque à bâtir, une trajectoire à corriger, une mission à confier ? Parlons-en. La première
              conversation est gratuite — la suite, c&apos;est nous qui la portons. {IDENTITY.hashtags.join(" ")}
            </Lede>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <PrimaryCta href="/contact">Démarrer un projet</PrimaryCta>
            <GhostCta href="/lafusee">Découvrir La Fusée</GhostCta>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
