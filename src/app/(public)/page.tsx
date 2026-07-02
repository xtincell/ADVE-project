import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Rocket } from "lucide-react";
import { ADVE_PILLARS, PILLARS, isAdve } from "@/domain/pillars";
import { COMPOSITE_MAX_SCORE } from "@/domain/scoring";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeader } from "@/components/marketing/section";
import {
  CLIENT_STRIP,
  CONTACT,
  IDENTITY,
  METHOD_STAGES,
  REALISATIONS,
  SERVICE_DOORS,
  STATS,
} from "@/components/marketing/site-data";
import { formatPostDate, getAllPosts } from "@/components/marketing/blog-posts";
import { productSiteUrl } from "@/lib/hosts";

export const metadata: Metadata = {
  title: { absolute: "UPgraders — cabinet de conseil & stratégie · La passion pour propulseur" },
  description:
    "UPgraders industrialise la production de marques en Afrique francophone. Conseil stratégique (ADVE/RTIS), réseau de talents curatés (La Guilde) et l'OS La Fusée. Depuis 2017, Douala · Abidjan.",
};

/**
 * `/` — le site d'AGENCE (WP-025). La racine appartient à UPgraders, comme en
 * prod legacy : hero « La passion pour propulseur », les 3 portes de l'offre
 * (sur devis), les 12 réalisations, la méthode en teaser, le blog en teaser,
 * le contact — et UNE section produit sobre « Notre OS : La Fusée » qui renvoie
 * vers le sous-domaine produit. Aucun tarif produit ici (ils vivent sur
 * lafusee.<racine>/tarifs). Copy portée de legacy/(marketing)/page.tsx +
 * site-data (canon legacy data.ts) — rien d'inventé.
 */

/* ── Hero — l'agence ──────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter pb-20 pt-14 sm:pb-28">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft pb-4 font-mono text-xs uppercase tracking-widest text-smoke-2">
          <span>Cabinet de conseil &amp; stratégie</span>
          <span className="text-coral">·</span>
          <span>Depuis {IDENTITY.founded}</span>
          <span className="text-coral">·</span>
          <span>Douala · Abidjan</span>
          <span className="text-coral">·</span>
          <span>IP — méthode ADVE/RTIS</span>
        </p>
        <p className="eyebrow mt-10 text-coral">UPgraders — l&apos;agence</p>
        <h1 className="font-display mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] sm:text-6xl">
          La passion pour <span className="text-coral">propulseur</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand">
          UPgraders <strong className="text-bone">industrialise la production de marques</strong>{" "}
          en Afrique francophone. Un cabinet de conseil &amp; stratégie qui orchestre un réseau
          de freelances et d&apos;agences partenaires pour transformer des marques en{" "}
          <strong className="text-bone">phénomènes culturels</strong>.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            Démarrer un projet <ArrowRight />
          </Link>
          <Link href="/methode" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Découvrir la méthode
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sand transition-colors hover:text-bone"
          >
            Nos services <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-smoke-2">
          ↳ réponse sous 24 h · WhatsApp · Douala · Abidjan
        </p>
        <p className="mt-8 border-t border-dashed border-line-soft pt-4 font-mono text-xs text-smoke-2">
          La Fusée — notre OS produit
          <Link href="/intake" className="ml-3 text-sand transition-colors hover:text-coral">
            → Diagnostic gratuit
          </Link>
          <Link
            href={productSiteUrl()}
            className="ml-3 text-sand transition-colors hover:text-coral"
          >
            → Découvrir l&apos;OS
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ── Bandeau clients — preuve sociale canon ───────────────────────────── */

function ClientsStrip() {
  return (
    <section className="border-b border-ink/8 bg-white">
      <div className="mx-auto max-w-page px-gutter py-8">
        <p className="text-center font-mono text-xs uppercase tracking-widest text-smoke-2">
          Des marques bâties ou propulsées par le cabinet
        </p>
        <ul
          className="mt-5 flex flex-wrap justify-center gap-2"
          aria-label="Marques accompagnées par UPgraders"
        >
          {CLIENT_STRIP.map((name) => (
            <li
              key={name}
              className="rounded-xs border border-ink/12 px-3 py-1.5 font-mono text-xs text-graphite"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 01 · L'offre — les 3 portes, sur devis ───────────────────────────── */

function Offre() {
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeader
          num="01"
          eyebrow="L'offre"
          title={
            <>
              Trois portes, <span className="text-coral">une mécanique</span>.
            </>
          }
          lede="On entre par un audit, un mandat complet ou une collaboration en marque blanche. Les prestations s'opèrent sur devis : on ne vend pas des moyens, on gèle un état final mesuré."
        />
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 pb-1 text-sm font-semibold text-coral hover:underline"
        >
          L&apos;offre en détail <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-10 grid gap-bento lg:grid-cols-3">
        {SERVICE_DOORS.map((s) => (
          <div
            key={s.mark}
            className={`flex flex-col rounded-xl p-8 ${
              s.featured
                ? "bg-ink text-bone shadow-card-lg"
                : "border border-ink/10 bg-white shadow-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`font-mono text-xs font-semibold ${
                  s.featured ? "text-gold" : "text-coral"
                }`}
              >
                {s.mark}
              </p>
              {s.featured ? <Badge variant="coral">Formule reine</Badge> : null}
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold">{s.title}</h3>
            <p className={`eyebrow mt-1 ${s.featured ? "text-sand" : "text-smoke-2"}`}>
              {s.duration}
            </p>
            <p
              className={`mt-4 flex-1 text-sm leading-relaxed ${
                s.featured ? "text-sand" : "text-smoke"
              }`}
            >
              {s.desc}
            </p>
            <p
              className={`mt-6 flex items-center justify-between gap-3 border-t pt-4 text-sm font-bold ${
                s.featured ? "border-line" : "border-ink/8"
              }`}
            >
              <span>{s.tag}</span>
              <span className={`eyebrow ${s.featured ? "text-gold" : "text-coral"}`}>
                Sur devis
              </span>
            </p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-smoke">
        Chaque porte mobilise les cinq piliers du modèle — conseil, gestion déléguée, veille,
        La Guilde, conciergerie —{" "}
        <Link href="/contact" className="font-semibold text-coral hover:underline">
          parlez-nous de votre projet
        </Link>
        .
      </p>
    </Section>
  );
}

/* ── 02 · Réalisations — les 12 cas du track record ───────────────────── */

function Realisations() {
  return (
    <Section tone="dark">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeader
          tone="dark"
          num="02"
          eyebrow="Preuves"
          title={
            <>
              Les marques <span className="text-coral">parlent</span>.
            </>
          }
          lede="Sept ans de missions — brand build de bout en bout, direction artistique, production audiovisuelle, marque blanche. Le track record réel du cabinet et de La Guilde."
        />
        <Link
          href="/realisations"
          className="inline-flex items-center gap-1.5 pb-1 text-sm font-semibold text-coral hover:underline"
        >
          Toutes les réalisations <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-10 grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
        {REALISATIONS.map((r) => (
          <div key={r.name} className="flex flex-col gap-1.5 rounded-lg border border-line bg-ink-2 p-6">
            <h3 className="font-display text-lg font-semibold">{r.name}</h3>
            <p className="eyebrow text-coral">{r.sector}</p>
            <p className="mt-1 text-sm leading-relaxed text-sand">{r.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-bento md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-ink-2 p-6">
            <p className="font-display text-3xl font-semibold tracking-tight text-coral">
              {s.value}
            </p>
            <p className="eyebrow mt-1 text-smoke-2">{s.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── 03 · La méthode — teaser ADVE/RTIS ───────────────────────────────── */

function MethodeTeaser() {
  return (
    <Section>
      <SectionHeader
        num="03"
        eyebrow="Méthode propriétaire"
        title={
          <>
            ADVE<span className="text-coral">/RTIS</span>.
          </>
        }
        lede={
          <>
            Notre IP, formalisée sur sept ans. Un{" "}
            <strong className="text-ink">socle</strong> qui définit l&apos;identité de la
            marque, un <strong className="text-ink">propulseur</strong> qui la met en
            mouvement. Réexécutable, versionnable, automatisable — c&apos;est ce qui permet
            à La Fusée de tourner.
          </>
        }
      />
      <div
        className="mt-10 flex flex-wrap items-center gap-2"
        aria-label="Cascade A D V E vers R T I S"
      >
        {PILLARS.map((p, i) => (
          <span key={p} className="flex items-center gap-2">
            {i === ADVE_PILLARS.length && (
              <ArrowRight className="size-5 text-coral" aria-hidden="true" />
            )}
            <span
              className={`font-display flex size-12 items-center justify-center rounded-md text-lg font-semibold ${
                isAdve(p) ? "bg-coral text-white" : "border border-ink/12 bg-white text-graphite"
              }`}
            >
              {p}
            </span>
          </span>
        ))}
      </div>
      <div className="mt-10 grid gap-bento md:grid-cols-3">
        {METHOD_STAGES.map((s) => (
          <div key={s.name} className="rounded-lg bg-white p-6 shadow-card">
            <p className="font-mono text-xs text-coral">{s.letters}</p>
            <h3 className="font-display mt-2 text-xl font-semibold">{s.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-smoke">{s.desc}</p>
          </div>
        ))}
      </div>
      <Link
        href="/methode"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:underline"
      >
        La méthode en détail <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Section>
  );
}

/* ── 04 · Notre OS : La Fusée — LA section produit (sobre) ────────────── */

function NotreOs() {
  return (
    <Section tone="dark">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="eyebrow text-coral">
            <span className="mr-2 font-mono normal-case tracking-normal opacity-70">04</span>
            Le produit
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Notre OS : <span className="text-coral">La Fusée</span>.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-sand">
            <strong className="text-bone">La Fusée</strong> est le produit — l&apos;OS que
            vous pilotez. <strong className="text-bone">UPgraders</strong> est l&apos;agence
            qui l&apos;a construit et qui l&apos;opère.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-sand">
            L&apos;OS de marque : diagnostic sur 8 piliers, score /{COMPOSITE_MAX_SCORE},
            l&apos;Oracle stratégique, campagnes éclatées en missions, trajectoire mesurée
            palier par palier.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={productSiteUrl()} className={buttonVariants({ size: "md" })}>
              Découvrir La Fusée <ArrowUpRight />
            </Link>
            <Link
              href="/intake"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Diagnostic gratuit
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-ink-2 p-7">
          <span className="inline-flex size-11 items-center justify-center rounded-md bg-coral/12 text-coral">
            <Rocket className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-sand">
            Le diagnostic ADVE est gratuit — 15 minutes, sans engagement, sans carte
            bancaire. L&apos;univers produit (fonctionnalités, paliers, tarifs) vit sur son
            propre site.
          </p>
          <Link
            href={productSiteUrl()}
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-coral hover:underline"
          >
            lafusee — le site du produit <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ── 05 · Notes de cabinet — le blog en teaser ────────────────────────── */

function BlogTeaser() {
  const posts = getAllPosts().slice(0, 3);
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeader
          num="05"
          eyebrow="Notes de cabinet"
          title={
            <>
              Le <span className="text-coral">blog</span>.
            </>
          }
          lede="Ce qu'on apprend en bâtissant des marques en Afrique francophone — méthode, modèle d'agence, signaux de marché. Sans langue de bois."
        />
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 pb-1 text-sm font-semibold text-coral hover:underline"
        >
          Tous les articles <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-10 grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group flex flex-col gap-2 rounded-lg bg-white p-6 shadow-card transition-shadow hover:shadow-card-lg"
          >
            <p className="eyebrow text-smoke-2">
              <span className="text-coral">{p.category}</span>
              <span className="mx-2">·</span>
              {p.readingMinutes} min
            </p>
            <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-coral">
              {p.title}
            </h3>
            <p className="text-sm leading-relaxed text-smoke">{p.excerpt}</p>
            <p className="mt-auto pt-3 text-xs text-smoke-2">{formatPostDate(p.date)}</p>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ── 06 · Travailler avec nous — contact ──────────────────────────────── */

function Contact() {
  const whatsappDouala = CONTACT.whatsapp[0];
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-20 sm:py-24">
        <p className="eyebrow text-coral">
          <span className="mr-2 font-mono normal-case tracking-normal opacity-70">06</span>
          Travailler avec nous
        </p>
        <h2 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-tight">
          De la poussière <span className="text-coral">à l&apos;étoile</span>.
        </h2>
        <p className="mt-5 max-w-2xl text-lg text-sand">
          Une marque à bâtir, une trajectoire à corriger, une mission à confier ?
          Parlons-en. La première conversation est gratuite — la suite, c&apos;est nous qui
          la portons. {IDENTITY.hashtags.join(" ")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            Démarrer un projet <ArrowRight />
          </Link>
          {whatsappDouala ? (
            <a
              href={whatsappDouala.link}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <MessageCircle /> WhatsApp {whatsappDouala.label}
            </a>
          ) : null}
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-smoke-2">
          ↳ réponse sous 24 h ouvrées · {CONTACT.email}
        </p>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <ClientsStrip />
      <Offre />
      <Realisations />
      <MethodeTeaser />
      <NotreOs />
      <BlogTeaser />
      <Contact />
    </>
  );
}
