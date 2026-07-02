import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BatteryLow,
  Check,
  Route,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { ADVE_PILLARS, type AdvePillarKey } from "@/domain/pillars";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import { buttonVariants } from "@/components/ui/button";
import { CLIENT_STRIP, STATS } from "@/components/marketing/site-data";
import { ExpressForm } from "./express-form";

export const metadata: Metadata = {
  title: "Le Diagnostic ADVE — offert",
  description:
    "Le protocole ADVE analyse les 4 piliers fondamentaux de votre marque et vous remet une feuille de route claire — en 15 minutes, sans jargon. Offert, sans engagement, 100 % confidentiel.",
};

/**
 * /landingintake — landing d'acquisition dédiée (variante courte orientée
 * conversion), port de legacy/(marketing)/landingintake « La Fusée by
 * UPgraders ». Copy réelle du handoff reprise (hero, constat, 3 étapes,
 * protocole, agence, CTA) ; re-composée sur le DS v7 au lieu du stylesheet
 * scopé `.lf`. Ce qui n'a pas de source n'est PAS repris (règle n°6) :
 * « +250 dirigeants / 4,9/5 », témoignages nominatifs, score démo « 78 »,
 * faux « lien envoyé par email » — la preuve sociale est le canon réel
 * STATS + CLIENT_STRIP, comme sur la home.
 */

const WA_TEXT = encodeURIComponent(
  "Bonjour, je souhaite faire le Diagnostic ADVE de ma marque avec La Fusée.",
);
const WA_LINK = `https://wa.me/237694171799?text=${WA_TEXT}`;

/** Les 4 piliers du protocole — descriptions réelles du handoff legacy. */
const PILLAR_LINES: Record<AdvePillarKey, string> = {
  A: "L'ADN profond et la raison d'être de votre marque.",
  D: "Ce qui vous rend radicalement unique sur le marché.",
  V: "La solidité et la rentabilité de votre modèle.",
  E: "La force de votre communauté et de votre équipe.",
};

/* ── Hero ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-20 sm:py-28">
        <p className="eyebrow text-coral">Diagnostic ADVE · marques d&apos;Afrique francophone</p>
        <h1 className="font-display mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] sm:text-6xl">
          Diagnostiquez votre marque.
          <br />
          <span className="text-coral">Propulsez votre croissance.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand">
          Le protocole ADVE analyse les 4 piliers fondamentaux de votre marque
          et vous remet une feuille de route claire — en 15 minutes, sans
          jargon.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a href="#diagnostic" className={buttonVariants({ size: "lg" })}>
            Démarrer mon diagnostic — offert <ArrowRight />
          </a>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Parler sur WhatsApp
          </a>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sand">
          {["Évaluation immédiate", "Sans engagement", "100 % confidentiel"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 text-coral" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Le constat (copy legacy) ─────────────────────────────────────────── */

function Constat() {
  const items = [
    {
      n: "01",
      icon: Shuffle,
      title: "Des efforts dispersés",
      desc: "Des actions marketing lancées sans cohérence : elles coûtent cher et rapportent peu.",
    },
    {
      n: "02",
      icon: Route,
      title: "Un manque de clarté",
      desc: "Une proposition de valeur diluée dans un marché saturé. Vous peinez à vous démarquer.",
    },
    {
      n: "03",
      icon: BatteryLow,
      title: "Tout repose sur vous",
      desc: "L'absence de système freine l'autonomie de l'équipe — et épuise le dirigeant.",
    },
  ] as const;
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">Le constat</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            L&apos;intuition vous a mené loin.
            <br />
            <span className="text-coral">Il vous faut un système.</span>
          </h2>
          <p className="mt-5 text-lg text-graphite">
            Diriger une marque en Afrique francophone demande une énergie
            colossale. Naviguer à vue finit par coûter la chose la plus
            précieuse : une marque pérenne et structurellement rentable.
          </p>
        </div>
        <div className="mt-12 grid gap-bento sm:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="relative rounded-lg bg-white p-6 shadow-card">
              <span className="font-display absolute right-5 top-4 text-4xl font-semibold text-bone-2">
                {it.n}
              </span>
              <span className="inline-flex size-11 items-center justify-center rounded-md bg-coral/12 text-coral">
                <it.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-smoke">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Comment ça marche — 3 étapes (copy legacy, cadrée sur le réel v7) ── */

function Etapes() {
  const steps = [
    {
      n: "1",
      tag: "~15 minutes",
      title: "Vous répondez",
      desc: "Un questionnaire guidé sur les 4 piliers ADVE. Chaque champ est optionnel — vous répondez à ce que vous savez.",
    },
    {
      n: "2",
      tag: "Instantané",
      title: "Vous recevez votre score",
      desc: "Un diagnostic clair sur 100, pilier par pilier, avec vos forces et vos angles morts.",
    },
    {
      n: "3",
      tag: "Activable",
      title: "Vous passez à l'action",
      desc: "Vos 3 prochaines actions priorisées — et l'option d'être accompagné par UPgraders pour les exécuter.",
    },
  ] as const;
  return (
    <section className="texture-geo bg-ink-0 text-bone">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow justify-center text-coral">En 3 étapes</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            Comment ça <span className="text-coral">marche</span>
          </h2>
          <p className="mt-5 text-lg text-sand">
            Du brief au plan d&apos;action, sans friction. Simple, rapide, concret.
          </p>
        </div>
        <ol className="mt-12 grid gap-bento sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="rounded-xl border border-line bg-ink-2 p-7 text-center">
              <span className="font-display mx-auto flex size-12 items-center justify-center rounded-full bg-coral text-xl font-semibold text-white">
                {s.n}
              </span>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-xs bg-white/8 px-2.5 py-1 font-mono text-xs text-sand-2">
                <Sparkles className="size-3 text-coral" aria-hidden="true" /> {s.tag}
              </p>
              <h3 className="mt-3 text-lg font-bold text-bone">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sand">{s.desc}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <a href="#diagnostic" className={buttonVariants({ size: "lg" })}>
            Lancer mon diagnostic <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Le protocole — 4 piliers ADVE (copy legacy) ──────────────────────── */

function Protocole() {
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">Le protocole</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            Quatre piliers. <span className="text-coral">Une vision claire.</span>
          </h2>
          <p className="mt-5 text-lg text-graphite">
            ADVE fait l&apos;état des lieux de votre marque sans jargon, sur
            les dimensions qui font réellement la différence pour une marque en
            croissance.
          </p>
        </div>
        <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
          {ADVE_PILLARS.map((key) => (
            <div key={key} className="rounded-lg bg-white p-6 shadow-card">
              <span className="font-display flex size-11 items-center justify-center rounded-md bg-coral text-xl font-semibold text-white">
                {key}
              </span>
              <h3 className="mt-4 text-lg font-bold">{PILLAR_LABELS[key]}</h3>
              <p className="mt-2 text-sm leading-relaxed text-smoke">{PILLAR_LINES[key]}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 font-mono text-xs text-smoke">
          ↳ le socle ADVE est la partie déclarée de la méthode complète
          ADVE→RTIS —{" "}
          <Link href="/methode" className="text-coral hover:underline">
            la méthode en détail
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ── La preuve — track record réel (STATS + CLIENT_STRIP canon) ───────── */

function Preuve() {
  return (
    <section className="border-y border-ink/8 bg-white">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">La preuve</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            Une méthode née <span className="text-coral">sur le terrain</span>.
          </h2>
          <p className="mt-5 text-lg text-graphite">
            Le diagnostic industrialise la méthode qu&apos;UPgraders applique
            en agence depuis 2017. Les marques ci-dessous ont été bâties ou
            propulsées par le cabinet et sa Guilde de talents.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-bento md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-lg bg-bone p-6">
              <p className="font-display text-3xl font-semibold tracking-tight text-coral">
                {s.value}
              </p>
              <p className="eyebrow mt-1 text-smoke">{s.label}</p>
            </div>
          ))}
        </div>
        <ul
          className="mt-8 flex flex-wrap gap-2"
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

/* ── Le formulaire — mini-funnel vers /intake ─────────────────────────── */

function Formulaire() {
  return (
    <section id="diagnostic" className="texture-geo scroll-mt-20 bg-ink text-bone">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-coral">Diagnostic offert · 15 min</p>
            <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
              Démarrez votre <span className="text-coral">diagnostic</span>.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-sand">
              Trois informations, et on lance l&apos;évaluation ADVE de votre
              marque. Vous répondez ensuite à ce que vous savez — chaque champ
              du questionnaire est optionnel.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-sand">
              {[
                "Score /100 du socle ADVE, pilier par pilier",
                "Palier projeté sur l'échelle LATENT → ICONE",
                "Vos 3 prochaines actions, dans l'ordre de la cascade",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-xs text-smoke-2">
              ↳ vous préférez commencer directement ?{" "}
              <Link href="/intake" className="text-sand transition-colors hover:text-coral">
                Ouvrir le questionnaire →
              </Link>
            </p>
          </div>
          <div className="rounded-xl border border-line bg-ink-2 p-7 sm:p-8">
            <ExpressForm />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── L'agence derrière l'outil (copy legacy, chiffres canon) ──────────── */

function Agence() {
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <p className="eyebrow text-coral">L&apos;agence derrière l&apos;outil</p>
            <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
              La Fusée est propulsée par <span className="text-coral">UPgraders</span>.
            </h2>
            <p className="mt-5 text-lg text-graphite">
              Cabinet de conseil, branding &amp; digital basé à Douala, au
              service des entrepreneurs d&apos;Afrique francophone. Une fois
              votre score établi, l&apos;équipe peut prendre le relais pour
              exécuter votre feuille de route — du branding à la croissance.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Expertises UPgraders">
              {["Stratégie", "Branding", "Marketing digital", "Réseaux sociaux", "Photographie"].map(
                (s) => (
                  <li
                    key={s}
                    className="rounded-xs border border-ink/12 px-3 py-1.5 font-mono text-xs text-graphite"
                  >
                    {s}
                  </li>
                ),
              )}
            </ul>
          </div>
          <Link
            href="/agence"
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            Découvrir UPgraders <ArrowUpRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── CTA finale (copy legacy) ─────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-20 text-center sm:py-24">
        <h2 className="font-display mx-auto max-w-2xl text-4xl font-semibold leading-tight">
          Prêt à passer au <span className="text-coral">niveau supérieur</span> ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-sand">
          Commencez par un diagnostic offert de 15 minutes. Sans engagement,
          sans carte bancaire.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href="#diagnostic" className={buttonVariants({ size: "lg" })}>
            Démarrer mon diagnostic <ArrowUpRight />
          </a>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Discuter sur WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export default function LandingIntakePage() {
  return (
    <>
      <Hero />
      <Constat />
      <Etapes />
      <Protocole />
      <Preuve />
      <Formulaire />
      <Agence />
      <FinalCta />
    </>
  );
}
