import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import {
  AGENCY_VALUES,
  IDENTITY,
  STATS,
  TEAM,
  TIMELINE,
} from "@/components/marketing/site-data";

export const metadata: Metadata = {
  title: "L'agence — UPgraders",
  description:
    "UPgraders, cabinet de conseil & stratégie fondé en 2017 à Douala. De l'agence digitale à l'industrialisation de la production de marques en Afrique francophone. Équipe, trajectoire, convictions.",
};

/**
 * Qui est UPgraders — port de legacy/(marketing)/agence : récit fondateur,
 * direction, quatre convictions, trajectoire 2017→2026, marché.
 */

function StatsRow() {
  return (
    <div className="grid grid-cols-2 gap-bento md:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="rounded-lg bg-white p-6 shadow-card">
          <p className="font-display text-3xl font-semibold tracking-tight text-coral">{s.value}</p>
          <p className="eyebrow mt-1 text-smoke">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function AgencePage() {
  return (
    <>
      <PageHero
        eyebrow="Qui sommes-nous"
        title={
          <>
            UPgraders, l&apos;usine à <span className="text-coral">marques cultes</span>.
          </>
        }
        lede={
          <>
            Cabinet de conseil &amp; stratégie fondé en 2017 à Douala. Nous avons commencé en
            agence de marketing digital, puis pivoté en conciergerie créative, pour devenir
            l&apos;agence qui industrialise la production de marques en Afrique francophone.
          </>
        }
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Démarrer un projet <ArrowRight />
        </Link>
        <Link href="/realisations" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Voir nos réalisations
        </Link>
      </PageHero>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <SectionHeader
            num="01"
            eyebrow="Le récit fondateur"
            title={
              <>
                De la poussière <span className="text-coral">à l&apos;étoile</span>.
              </>
            }
          />
          <div className="flex flex-col gap-4 text-lg leading-relaxed text-graphite">
            <p>
              UPgraders naît en 2017 sous l&apos;impulsion d&apos;Ingrid Nya Ngatchou et
              Jean-Philippe Veigne. Très vite, un constat : sur nos marchés, le branding souffre
              d&apos;un <strong className="text-ink">double déficit</strong> — la confiance entre
              entreprises et talents locaux, et les compétences structurantes côté talents.
            </p>
            <p>
              La réponse n&apos;est pas un créatif providentiel de plus. C&apos;est une{" "}
              <strong className="text-ink">méthode codifiée</strong> (ADVE/RTIS), un{" "}
              <strong className="text-ink">réseau curaté</strong> (La Guilde) et un{" "}
              <strong className="text-ink">OS propriétaire</strong> (La Fusée) pour rendre
              l&apos;excellence reproductible. Le modèle devient la marque.
            </p>
            <p>
              En 2025, Alexandre « Xtincell » Djengue — stratège, photographe, vidéaste et
              designer — prend le relais comme CEO, ses co-fondateurs restant en éminences.
              Devise de la maison : <em className="text-ink">« De la poussière à l&apos;étoile. »</em>
            </p>
          </div>
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeader
          num="02"
          eyebrow="La direction"
          tone="dark"
          title={
            <>
              L&apos;équipe derrière <span className="text-coral">UPgraders</span>
            </>
          }
          lede="Une histoire de passage de relais. La direction n'est jamais déconnectée du métier — le CEO opère aussi sur le terrain quand le brief le demande."
        />
        <div className="mt-12 grid gap-bento md:grid-cols-3">
          {TEAM.map((m) => (
            <div
              key={m.name}
              className={`flex flex-col gap-2 rounded-xl border bg-ink-2 p-7 ${
                m.lead ? "border-coral/60" : "border-line"
              }`}
            >
              <p className={`eyebrow ${m.lead ? "text-coral" : "text-smoke-2"}`}>{m.role}</p>
              <h3 className="font-display text-lg font-semibold">{m.name}</h3>
              <p className="text-xs text-sand">{m.tag}</p>
              <p className="mt-1 text-sm leading-relaxed text-sand">{m.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          num="03"
          eyebrow="Ce qui nous tient"
          title={
            <>
              Quatre <span className="text-coral">convictions</span>
            </>
          }
        />
        <div className="mt-10 grid gap-bento md:grid-cols-2">
          {AGENCY_VALUES.map((v, i) => (
            <div key={v.title} className="rounded-lg bg-white p-7 shadow-card">
              <p className="font-mono text-xs font-semibold text-coral">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="font-display mt-3 text-xl font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-smoke">{v.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeader
          num="04"
          eyebrow="Depuis 2017"
          tone="dark"
          title={
            <>
              La trajectoire — 2017 → <span className="text-coral">2026</span>
            </>
          }
        />
        <div className="mt-10">
          {TIMELINE.map((row) => (
            <div
              key={row.year}
              className="grid grid-cols-[64px_1fr] gap-5 border-t border-line py-5 md:grid-cols-[120px_1fr]"
            >
              <p className="font-display text-xl font-semibold text-coral">{row.year}</p>
              <p className="text-sm leading-relaxed text-sand">
                {row.lead ? <strong className="font-semibold text-bone">{row.lead} </strong> : null}
                {row.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          num="05"
          eyebrow="Le marché"
          title={
            <>
              Afrique <span className="text-coral">francophone</span>.
            </>
          }
          lede="UEMOA, CEMAC et diaspora. Mobile-first, FCFA et mobile money (Wave, Orange, MTN, Moov). Notre client ultime n'est pas une marque — c'est l'industrie créative africaine francophone elle-même."
        />
        <div className="mt-12">
          <StatsRow />
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ink p-7 text-bone">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {IDENTITY.tagline.replace(/\.$/, "")} — la vôtre aussi ?
            </h2>
            <p className="mt-1 text-sm text-sand">
              Parlons de votre marque : la première conversation est gratuite.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/services" className={buttonVariants({ size: "md" })}>
              Voir les services <ArrowRight />
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: "outline", size: "md" })}>
              Nous contacter
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
