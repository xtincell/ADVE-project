import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Gauge,
  GitBranch,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";
import { BRAND_LEVELS, type BrandLevel } from "@/domain/pillars";
import {
  COMPOSITE_MAX_SCORE,
  LEVEL_DEFINITIONS,
  LEVEL_UPPER_BOUNDS_200,
} from "@/domain/scoring";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeader } from "@/components/marketing/section";
import { LafuseeRadar } from "@/components/marketing/lafusee-radar";

export const metadata: Metadata = {
  title: "La Fusée — le produit",
  description:
    "La Fusée, le produit d'UPgraders : diagnostic ADVE gratuit, score de marque /200, radar 8 piliers, l'Oracle stratégique, campagnes éclatées en missions et la Guilde de talents. En FCFA, pensé mobile money.",
};

/**
 * /lafusee — LA vitrine PRODUIT autonome (port de legacy/(marketing)/lafusee,
 * qui composait 13 sections marketing). Depuis WP-025 la home `/` est le site
 * AGENCE et cet univers vit sur son sous-domaine (lafusee.<racine>, alias `/`
 * — cf. src/lib/hosts.ts) avec sa sous-nav (layout.tsx) et ses tarifs
 * (/lafusee/tarifs, montants ZoneIndex). Ici on ne parle que de l'OS :
 * doctrine (superfans × Overton), radar branché sur le vrai moteur de
 * scoring, features réellement livrées en v7 (diagnostic, cockpit piliers,
 * Oracle, campagnes→missions, guilde), paliers canon. Copy portée du legacy ;
 * les métriques inventées du handoff (compteurs telemetry, « 47 marques »)
 * ne sont PAS reprises — règle n°6.
 */

/* ── Hero ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-24 sm:py-32">
        <p className="eyebrow text-coral">La Fusée · le produit — l&apos;OS de marque</p>
        <h1 className="font-display mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] sm:text-6xl">
          De la poussière <span className="text-coral">à l&apos;étoile</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand">
          Vous déclarez votre marque, La Fusée fait le reste : diagnostic sur
          8 piliers, score /{COMPOSITE_MAX_SCORE}, stratégie complète —
          l&apos;Oracle — puis l&apos;exécution pilotée : campagnes, briefs,
          missions, jusqu&apos;à la Guilde de talents.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/intake" className={buttonVariants({ size: "lg" })}>
            Diagnostiquer ma marque <ArrowRight />
          </Link>
          <Link
            href="/lafusee/tarifs"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Voir les offres
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sand">
          {["Gratuit", "15 minutes", "Sans engagement"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 text-coral" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl border-t border-line-soft pt-5 font-mono text-xs leading-relaxed text-smoke-2">
          ↳ La Fusée est le produit. L&apos;agence qui l&apos;a codifié et qui
          l&apos;opère, c&apos;est{" "}
          <Link href="/agence" className="text-sand transition-colors hover:text-coral">
            UPgraders →
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ── 01 · Doctrine — les deux mécaniques (copy legacy manifesto) ──────── */

function Doctrine() {
  return (
    <Section tone="dark">
      <SectionHeader
        tone="dark"
        num="01"
        eyebrow="Doctrine"
        title={
          <>
            Une marque ne meurt pas oubliée. Elle meurt de n&apos;avoir{" "}
            <span className="text-coral">jamais bougé l&apos;axe</span>.
          </>
        }
        lede="La Fusée ne court pas après les vues. On industrialise deux mécaniques — et seulement deux — qui font qu'un secteur se redéfinit autour d'une marque."
      />
      <div className="mt-10 grid gap-bento md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <article className="rounded-xl border border-line bg-ink-2 p-7">
          <p className="font-mono text-xs text-coral">I.</p>
          <h3 className="font-display mt-2 text-2xl font-semibold">Superfans</h3>
          <p className="mt-3 text-sm leading-relaxed text-sand">
            Pas des followers. Pas une communauté tiède. Des prescripteurs qui
            produisent du travail organique pour la marque sans qu&apos;on leur
            demande.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-sand">
            Quand cette masse passe le{" "}
            <strong className="text-bone">seuil critique</strong> de votre
            secteur, le marché vous entend même quand vous vous taisez.
          </p>
        </article>
        <div
          aria-hidden="true"
          className="hidden items-center justify-center font-mono text-2xl text-smoke-2 md:flex"
        >
          ×
        </div>
        <article className="rounded-xl border border-line bg-ink-2 p-7">
          <p className="font-mono text-xs text-coral">II.</p>
          <h3 className="font-display mt-2 text-2xl font-semibold">Overton</h3>
          <p className="mt-3 text-sm leading-relaxed text-sand">
            Chaque secteur a une fenêtre d&apos;opinions et de codes
            acceptables. Une marque icône ne joue pas dans la fenêtre — elle la{" "}
            <strong className="text-bone">déplace</strong>.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-sand">
            Quand l&apos;axe bouge, les concurrents s&apos;orientent autour de
            votre direction. Le pricing power suit. C&apos;est ça, le
            verrouillage culturel.
          </p>
        </article>
      </div>
      <p className="mt-8 border-t border-dashed border-line pt-4 font-mono text-xs text-smoke-2">
        ↳ tout l&apos;OS sert ces deux mécaniques. tout le reste est subordonné.
      </p>
    </Section>
  );
}

/* ── 02 · Le radar — simulateur branché sur le vrai moteur ────────────── */

function Radar() {
  return (
    <Section tone="dark" className="border-t border-line-soft">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeader
          tone="dark"
          num="02"
          eyebrow="Méthode ADVE→RTIS"
          title={
            <>
              Huit dimensions. Une note.{" "}
              <span className="text-coral">/{COMPOSITE_MAX_SCORE}.</span>
            </>
          }
          lede={
            <>
              Chaque marque est radiographiée sur 8 piliers — 4 déclarés
              (ADVE), 4 dérivés (RTIS). Score déterministe, transparent,
              actionnable : la cascade{" "}
              <span className="font-mono text-coral">A → D → V → E → R → T → I → S</span>{" "}
              gouverne tout l&apos;OS.
            </>
          }
        />
        <div className="flex flex-col gap-2 pb-1 text-sm">
          <Link
            href="/methode"
            className="inline-flex items-center gap-1.5 font-semibold text-coral hover:underline"
          >
            La méthode en détail <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/intake/score"
            className="inline-flex items-center gap-1.5 font-semibold text-sand transition-colors hover:text-bone"
          >
            Comprendre le score /{COMPOSITE_MAX_SCORE}{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-12">
        <LafuseeRadar />
      </div>
    </Section>
  );
}

/* ── 03 · Ce que l'OS fait aujourd'hui — features réelles v7 ──────────── */

const FEATURES = [
  {
    icon: Gauge,
    title: "Le diagnostic ADVE",
    desc: "Un questionnaire guidé de 15 minutes, chaque champ optionnel. Score du socle /100, palier projeté, forces, angles morts et 3 prochaines actions — recalculé à chaque lecture, jamais stocké.",
    href: "/intake",
    link: "Lancer le diagnostic",
  },
  {
    icon: Layers,
    title: "Le Cockpit piliers",
    desc: "Les 8 piliers de votre marque, éditables champ par champ. Le socle ADVE se déclare — chaque inférence reste « à valider » tant que vous n'avez pas tranché ; RTIS se dérive du socle, jamais édité à la main.",
    href: "/methode",
    link: "La cascade en détail",
  },
  {
    icon: FileText,
    title: "L'Oracle",
    desc: "Le document stratégique complet de la marque, composé déterministiquement depuis vos piliers. Sections re-composables, marquées périmées dès que le socle bouge, version imprimable.",
    href: "/lafusee/tarifs",
    link: "Inclus au plan Cockpit",
  },
  {
    icon: GitBranch,
    title: "Campagnes → missions",
    desc: "Du cadre de campagne au brief validé, éclaté en missions : un circuit à gates explicites (ouverte → assignée → livrée → validée), coûts d'action estimés par marché en FCFA — « à estimer » quand le référentiel ne sait pas, jamais un montant inventé.",
    href: "/services",
    link: "Le mandat RTIS",
  },
  {
    icon: Users,
    title: "La Guilde",
    desc: "Le réseau de talents curatés d'UPgraders — photo, vidéo, design, motion, copy. Une cellule sur mesure convoquée à la mission, pas une équipe figée.",
    href: "/la-guilde",
    link: "Découvrir la Guilde",
  },
  {
    icon: TrendingUp,
    title: "La trajectoire mesurée",
    desc: "Chaque évolution du socle recalcule le score ; l'historique conserve chaque palier franchi. Et chaque mutation métier écrit une ligne d'audit hash-chaînée — vérifiable, pas déclarative.",
    href: "/intake/score",
    link: "Comprendre le score",
  },
] as const;

function Features() {
  return (
    <Section>
      <SectionHeader
        num="03"
        eyebrow="Le produit, aujourd'hui"
        title={
          <>
            Ce que l&apos;OS fait <span className="text-coral">réellement</span>.
          </>
        }
        lede="Pas de roadmap déguisée en produit : chaque bloc ci-dessous est livré et en service dans La Fusée."
      />
      <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col rounded-lg bg-white p-6 shadow-card">
            <span className="inline-flex size-11 items-center justify-center rounded-md bg-coral/12 text-coral">
              <f.icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-smoke">{f.desc}</p>
            <Link
              href={f.href}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:underline"
            >
              {f.link} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── 04 · Les paliers — bornes réelles du moteur ──────────────────────── */

/** Bande de score réelle d'un palier sur l'échelle /200 (bornes canon). */
function levelRange(level: BrandLevel): string {
  if (level === "ICONE") return `> ${LEVEL_UPPER_BOUNDS_200.CULTE}`;
  const upper = LEVEL_UPPER_BOUNDS_200[level];
  const i = BRAND_LEVELS.indexOf(level);
  const prev = i > 0 ? BRAND_LEVELS[i - 1] : undefined;
  if (!prev || prev === "ICONE") return `≤ ${upper}`;
  return `${LEVEL_UPPER_BOUNDS_200[prev] + 1}–${upper}`;
}

function Paliers() {
  const descending = [...BRAND_LEVELS].reverse();
  return (
    <Section tone="dark">
      <SectionHeader
        tone="dark"
        num="04"
        eyebrow="La trajectoire"
        title={
          <>
            La marque décolle. <span className="text-coral">Ou elle retombe.</span>
          </>
        }
        lede="Aucune marque ne saute de palier. Six niveaux, du sol (LATENT) à l'apex (ICONE) — chacun a ses signaux observables, et le score dit où vous êtes."
      />
      <ol className="mt-12 divide-y divide-line border-y border-line">
        {descending.map((level) => {
          const def = LEVEL_DEFINITIONS[level];
          const apex = level === "ICONE";
          return (
            <li
              key={level}
              className="grid gap-4 py-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] sm:gap-8"
            >
              <div>
                <p className="font-mono text-xs text-smoke-2">
                  {String(BRAND_LEVELS.indexOf(level) + 1).padStart(2, "0")} ·{" "}
                  {levelRange(level)} /{COMPOSITE_MAX_SCORE}
                </p>
                <p
                  className={`font-display mt-1 text-3xl font-semibold tracking-tight ${
                    apex ? "text-coral" : "text-bone"
                  }`}
                >
                  {def.label}
                </p>
                <p className="mt-1 text-sm text-sand">{def.tagline}</p>
              </div>
              <p className="text-sm leading-relaxed text-sand sm:pt-5">{def.signals}</p>
            </li>
          );
        })}
      </ol>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl font-mono text-xs leading-relaxed text-smoke-2">
          ↳ la trajectoire n&apos;est pas une promesse. c&apos;est un protocole
          — et il est mesurable.
        </p>
        <Link href="/intake" className={buttonVariants({ size: "sm" })}>
          Trouver votre palier en 15 min <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}

/* ── 05 · L'accès — FCFA, mobile money ────────────────────────────────── */

function Acces() {
  return (
    <Section className="border-y border-ink/8">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <SectionHeader
          num="05"
          eyebrow="L'accès"
          title={
            <>
              Un OS en FCFA, <span className="text-coral">pensé mobile money</span>.
            </>
          }
          lede="Le diagnostic est gratuit. Le Cockpit démarre à 8 000 FCFA/mois — prix résolu par zone, jamais une grille plaquée — payable mobile money (Wave, Orange Money, MTN MoMo, Moov) ou via WhatsApp."
        />
        <div className="flex flex-wrap items-center gap-3 pb-1">
          <Badge variant="coral">Cockpit · mensuel</Badge>
          <Badge variant="neutral">Retainer · trimestriel</Badge>
          <Link href="/lafusee/tarifs" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Les tarifs en détail <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ── Finale ───────────────────────────────────────────────────────────── */

function Finale() {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-20 text-center sm:py-24">
        <p className="eyebrow text-coral">Préparation au décollage</p>
        <h2 className="font-display mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-tight">
          Une trajectoire <span className="text-coral">mesurée</span>. Pas une promesse.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-sand">
          15 minutes pour le diagnostic. La Fusée signe ses transitions avec
          des chiffres — pas avec des slides.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/intake" className={buttonVariants({ size: "lg" })}>
            Diagnostiquer ma marque <ArrowRight />
          </Link>
          <a
            href="https://wa.me/237694171799"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Discuter sur WhatsApp
          </a>
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-widest text-smoke-2">
          ↳ gratuit · 15 min · sans engagement
        </p>
      </div>
    </section>
  );
}

export default function LaFuseePage() {
  return (
    <>
      <Hero />
      <Doctrine />
      <Radar />
      <Features />
      <Paliers />
      <Acces />
      <Finale />
    </>
  );
}
