import Link from "next/link";
import {
  ArrowRight,
  BatteryLow,
  Check,
  FileText,
  Gauge,
  Rocket,
  Route,
  Shuffle,
} from "lucide-react";
import {
  ADVE_PILLARS,
  BRAND_LEVELS,
  PILLARS,
  RTIS_PILLARS,
  isAdve,
  type PillarKey,
} from "@/domain/pillars";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLIENT_STRIP, STATS } from "@/components/marketing/site-data";

/**
 * Landing publique — la promesse mission, le constat, la méthode ADVE→RTIS,
 * le process en 3 étapes, la preuve sociale (track record réel UPgraders),
 * le bandeau vers les pages du site de marque, le CTA vers /intake.
 * Copy réécrite depuis legacy/(marketing)/landingintake — sans métriques
 * inventées (les « +250 dirigeants / 4,9/5 » du handoff n'ont pas de source) ;
 * preuve sociale portée du canon legacy data.ts (STATS + CLIENT_STRIP réels).
 */

const PILLAR_COPY: Record<PillarKey, { name: string; desc: string }> = {
  A: { name: "Authenticité", desc: "L'ADN et la raison d'être — qui est la marque, vraiment." },
  D: { name: "Distinction", desc: "Ce qui vous rend radicalement unique sur votre marché." },
  V: { name: "Valeur", desc: "La promesse économique : offre, pricing, rentabilité." },
  E: { name: "Engagement", desc: "Les mécaniques relationnelles qui fidélisent." },
  R: { name: "Risque", desc: "Le diagnostic des menaces qui pèsent sur votre socle." },
  T: { name: "Tracking", desc: "La confrontation de votre marque à la réalité du marché." },
  I: { name: "Innovation", desc: "Le potentiel encore inexploité, révélé par les données." },
  S: { name: "Stratégie", desc: "La feuille de route qui convertit le potentiel en superfans." },
};

function Hero() {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-24 sm:py-32">
        <p className="eyebrow text-coral">La Fusée · l&apos;OS de marque, par UPgraders</p>
        <h1 className="font-display mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] sm:text-6xl">
          De marque locale à <span className="text-coral">icône culturelle</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand">
          La Fusée diagnostique votre marque sur 8 piliers, produit sa stratégie
          complète — l&apos;Oracle — puis industrialise ce qui fait les icônes :
          l&apos;accumulation de superfans qui font basculer votre secteur.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/intake" className={buttonVariants({ size: "lg" })}>
            Démarrer le diagnostic gratuit <ArrowRight />
          </Link>
          <Link
            href="/tarifs"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Voir les tarifs
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sand">
          {["15 minutes", "Sans engagement", "Confidentiel"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 text-coral" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Constat() {
  const items = [
    {
      icon: Shuffle,
      title: "Des efforts dispersés",
      desc: "Des actions marketing lancées sans cohérence : elles coûtent cher et rapportent peu.",
    },
    {
      icon: Route,
      title: "Un manque de clarté",
      desc: "Une proposition de valeur diluée dans un marché saturé. Difficile de se démarquer.",
    },
    {
      icon: BatteryLow,
      title: "Tout repose sur vous",
      desc: "Sans système, l'équipe ne peut pas prendre le relais — et le dirigeant s'épuise.",
    },
  ] as const;
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-page px-gutter py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">Le constat</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            L&apos;intuition vous a mené loin.
            <br />
            <span className="text-coral">Il vous faut un système.</span>
          </h2>
          <p className="mt-5 text-lg text-graphite">
            Diriger une marque en Afrique francophone demande une énergie
            colossale. Naviguer à vue finit par coûter le plus précieux : une
            marque pérenne, qui compte.
          </p>
        </div>
        <div className="mt-12 grid gap-bento sm:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="rounded-lg bg-white p-6 shadow-card">
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

function Methode() {
  return (
    <section className="texture-geo bg-ink-0 text-bone">
      <div className="mx-auto max-w-page px-gutter py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">La méthode</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            8 piliers. <span className="text-coral">4 déclarés, 4 dérivés.</span>
          </h2>
          <p className="mt-5 text-lg text-sand">
            Vous déclarez le socle <strong className="text-bone">ADVE</strong> —
            l&apos;OS dérive <strong className="text-bone">RTIS</strong> et le
            recalcule à chaque évolution de votre marque. Rien n&apos;est figé,
            rien n&apos;est laissé au hasard.
          </p>
          <Link
            href="/methode"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:underline"
          >
            La méthode en détail <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

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
                  isAdve(p) ? "bg-coral text-white" : "border border-line bg-ink-2 text-sand-2"
                }`}
              >
                {p}
              </span>
            </span>
          ))}
        </div>

        <div className="mt-12 grid gap-bento sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-ink-2 p-7">
            <Badge variant="coral">ADVE — votre socle</Badge>
            <ul className="mt-5 space-y-4">
              {ADVE_PILLARS.map((p) => (
                <li key={p} className="flex gap-4">
                  <span className="font-display mt-0.5 text-lg font-semibold text-coral">{p}</span>
                  <div>
                    <p className="font-bold">{PILLAR_COPY[p].name}</p>
                    <p className="text-sm text-sand">{PILLAR_COPY[p].desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-ink-2 p-7">
            <Badge variant="inverse">RTIS — dérivé par l&apos;OS</Badge>
            <ul className="mt-5 space-y-4">
              {RTIS_PILLARS.map((p) => (
                <li key={p} className="flex gap-4">
                  <span className="font-display mt-0.5 text-lg font-semibold text-sand-2">{p}</span>
                  <div>
                    <p className="font-bold">{PILLAR_COPY[p].name}</p>
                    <p className="text-sm text-sand">{PILLAR_COPY[p].desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    {
      icon: Gauge,
      n: "1",
      title: "Diagnostic gratuit",
      desc: "Un questionnaire guidé de 15 minutes — ou vos documents importés. Score sur 100, pilier par pilier, avec vos forces et vos angles morts.",
    },
    {
      icon: FileText,
      n: "2",
      title: "L'Oracle",
      desc: "Le document stratégique complet de votre marque : 35 sections, du positionnement au plan d'action, mis à jour au rythme de vos décisions.",
    },
    {
      icon: Rocket,
      n: "3",
      title: "Décollage",
      desc: "Campagnes, missions, talents de la Guilde : vous exécutez la feuille de route avec UPgraders, et la trajectoire se mesure palier par palier.",
    },
  ] as const;
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-page px-gutter py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">Le process</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            Du diagnostic au décollage, <span className="text-coral">en trois étapes</span>.
          </h2>
        </div>
        <ol className="mt-12 grid gap-bento sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="relative rounded-lg bg-white p-6 shadow-card">
              <span className="font-display absolute right-5 top-4 text-4xl font-semibold text-bone-2">
                {s.n}
              </span>
              <span className="inline-flex size-11 items-center justify-center rounded-md bg-coral/12 text-coral">
                <s.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-smoke">{s.desc}</p>
            </li>
          ))}
        </ol>
        <div className="mt-14 rounded-xl border border-ink/10 bg-white p-7 shadow-card">
          <p className="eyebrow text-smoke">La trajectoire mesurée</p>
          <div
            className="mt-4 flex flex-wrap items-center gap-2"
            aria-label={`Paliers de marque : ${BRAND_LEVELS.join(", ")}`}
          >
            {BRAND_LEVELS.map((lvl, i) => (
              <span key={lvl} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="size-4 text-smoke-2" aria-hidden="true" />}
                <span
                  className={`rounded-xs px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                    i === BRAND_LEVELS.length - 1
                      ? "bg-gold/20 text-gold-deep"
                      : "bg-ink/6 text-graphite"
                  }`}
                >
                  {lvl}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-sm text-smoke">
            Chaque marque est positionnée sur un palier, du sol (LATENT) à
            l&apos;apex (ICONE) — le score dit où vous êtes, la stratégie dit
            comment monter.
          </p>
        </div>
      </div>
    </section>
  );
}

function PreuveSociale() {
  return (
    <section className="border-y border-ink/8 bg-white">
      <div className="mx-auto max-w-page px-gutter py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">La preuve</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            Une méthode née <span className="text-coral">sur le terrain</span>.
          </h2>
          <p className="mt-5 text-lg text-graphite">
            La Fusée industrialise la méthode qu&apos;UPgraders applique en
            agence depuis 2017. Les marques ci-dessous ont été bâties ou
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
        <Link
          href="/realisations"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:underline"
        >
          Voir les réalisations <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

const EXPLORE_LINKS = [
  {
    href: "/methode",
    title: "La méthode",
    desc: "ADVE/RTIS en détail : les 8 lettres, les paliers LATENT → ICONE, l'obligation d'effet.",
  },
  {
    href: "/services",
    title: "Les services",
    desc: "Trois portes d'entrée : audit ADVE, mandat RTIS, marque blanche pour agences.",
  },
  {
    href: "/realisations",
    title: "Les réalisations",
    desc: "Motion19, Universal Music Africa, Orange, Chococam, KOF… le track record du cabinet.",
  },
  {
    href: "/la-guilde",
    title: "La Guilde",
    desc: "Le réseau de talents curatés — une cellule sur mesure pour chaque mission.",
  },
  {
    href: "/agence",
    title: "L'agence",
    desc: "UPgraders depuis 2017 : le récit, l'équipe, les convictions, la trajectoire.",
  },
  {
    href: "/blog",
    title: "Le blog",
    desc: "Les notes de cabinet — méthode, marché, modèle d'agence. Sans langue de bois.",
  },
] as const;

function Explorer() {
  return (
    <section className="texture-geo bg-ink-0 text-bone">
      <div className="mx-auto max-w-page px-gutter py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">Aller plus loin</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-tight">
            La méthode, l&apos;agence, <span className="text-coral">les preuves</span>.
          </h2>
        </div>
        <div className="mt-10 grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group rounded-xl border border-line bg-ink-2 p-6 transition-colors hover:border-coral/60"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{l.title}</h3>
                <ArrowRight
                  className="size-4 shrink-0 text-coral transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-sand">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-20 text-center sm:py-24">
        <h2 className="font-display mx-auto max-w-2xl text-4xl font-semibold leading-tight">
          Prêt à mettre votre marque <span className="text-coral">sur orbite</span> ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-sand">
          Commencez par le diagnostic offert. 15 minutes, sans engagement, sans
          carte bancaire.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/intake" className={buttonVariants({ size: "lg" })}>
            Démarrer mon diagnostic <ArrowRight />
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
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Constat />
      <Methode />
      <Process />
      <PreuveSociale />
      <Explorer />
      <FinalCta />
    </>
  );
}
