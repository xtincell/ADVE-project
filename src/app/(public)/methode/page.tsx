import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import {
  ADVE_STEPS,
  EFR_POINTS,
  METHOD_STAGES,
  RTIS_STEPS,
  type MethodStep,
} from "@/components/marketing/site-data";
import { BRAND_LEVELS, type BrandLevel } from "@/domain/pillars";
import {
  COMPOSITE_MAX_SCORE,
  LEVEL_DEFINITIONS,
  LEVEL_UPPER_BOUNDS_200,
  PILLAR_MAX_SCORE,
} from "@/domain/scoring";
import { DIAGNOSTIC_MAX_SCORE } from "@/domain/diagnostic";

export const metadata: Metadata = {
  title: "La méthode ADVE/RTIS",
  description:
    "ADVE/RTIS, la méthode propriétaire d'UPgraders : un socle ADVE (Authenticité · Distinction · Valeur · Engagement), un propulseur RTIS dérivé, un score /200 et six paliers de LATENT à ICONE — jusqu'aux superfans qui font basculer la fenêtre d'Overton.",
};

/**
 * La méthode — port de legacy/(marketing)/methode, recâblé sur les moteurs
 * v7 : les bornes de paliers et définitions viennent de src/domain/scoring
 * (rien d'inventé, mêmes constantes que le produit).
 */

/** Bande de score réelle d'un palier sur l'échelle /200 (bornes canon). */
function levelRange(level: BrandLevel): string {
  if (level === "ICONE") return `> ${LEVEL_UPPER_BOUNDS_200.CULTE}`;
  const upper = LEVEL_UPPER_BOUNDS_200[level];
  const i = BRAND_LEVELS.indexOf(level);
  const prev = i > 0 ? BRAND_LEVELS[i - 1] : undefined;
  if (!prev || prev === "ICONE") return `≤ ${upper}`;
  return `${LEVEL_UPPER_BOUNDS_200[prev] + 1}–${upper}`;
}

function MethodHalf({
  tag,
  title,
  sub,
  steps,
  derived,
}: {
  tag: string;
  title: string;
  sub: string;
  steps: MethodStep[];
  derived?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-ink-2 p-7 md:p-9">
      <Badge variant={derived ? "inverse" : "coral"}>{tag}</Badge>
      <h3 className="font-display mt-4 text-2xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-smoke-2">{sub}</p>
      <div className="mt-6 flex flex-col gap-5">
        {steps.map((s) => (
          <div key={s.code} className="flex gap-4">
            <span
              className={`font-display text-2xl font-semibold leading-none ${
                derived ? "text-sand-2" : "text-coral"
              }`}
            >
              {s.code}
            </span>
            <div>
              <p className="text-sm font-bold text-bone">
                {s.name} <span className="font-normal text-smoke-2">— {s.sub}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-sand">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MethodePage() {
  return (
    <>
      <PageHero
        eyebrow="Méthode propriétaire"
        title={
          <>
            ADVE<span className="text-coral">/RTIS</span>
          </>
        }
        lede="Notre IP, formalisée sur sept ans. Une méthode en deux temps : un socle qui définit ce que la marque est, un propulseur qui la met en mouvement. Réexécutable, versionnable, automatisable — c'est exactement ce que l'OS La Fusée orchestre."
      >
        <Link href="/intake" className={buttonVariants({ size: "lg" })}>
          Diagnostic gratuit <ArrowRight />
        </Link>
        <Link href="/services" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Travailler avec l&apos;agence
        </Link>
      </PageHero>

      <Section tone="dark">
        <SectionHeader
          num="01"
          eyebrow="Les huit lettres"
          tone="dark"
          title={
            <>
              Un socle, <span className="text-coral">un propulseur</span>
            </>
          }
          lede="Quatre lettres pour l'identité, quatre pour l'action. La cascade est unidirectionnelle : on ne propulse jamais une marque dont le socle n'est pas posé."
        />
        <div className="mt-12 grid gap-bento lg:grid-cols-2">
          <MethodHalf
            tag="Socle · ADVE — déclaré"
            title="L'identité"
            sub="Ce que la marque est, en propre. Mutable uniquement par votre décision."
            steps={ADVE_STEPS}
          />
          <MethodHalf
            tag="Propulseur · RTIS — dérivé"
            title="L'action"
            sub="Comment la marque se déploie. Dérivé du socle, recalculé à chaque évolution."
            steps={RTIS_STEPS}
            derived
          />
        </div>
        <p className="mt-5 rounded-lg border border-line bg-ink-2 p-5 text-center font-mono text-sm text-sand">
          A → D → V → E <span className="mx-3 text-coral">║</span> R → T → I → S
          <span className="eyebrow mt-1 block text-smoke-2">
            socle — l&apos;identité ║ propulseur — l&apos;action
          </span>
        </p>
      </Section>

      <Section>
        <SectionHeader
          num="02"
          eyebrow="L'architecture"
          title={
            <>
              Trois <span className="text-coral">étages</span>
            </>
          }
          lede="Comme une fusée : un booster qui arrache la marque au sol, deux étages qui la mettent en orbite. Chaque étage ne s'allume que si le précédent a tenu."
        />
        <div className="mt-10 grid gap-bento md:grid-cols-3">
          {METHOD_STAGES.map((s, i) => (
            <div key={s.name} className="rounded-lg bg-white p-7 shadow-card">
              <p className="font-mono text-xs font-semibold text-coral">Étage {i + 1}</p>
              <h3 className="font-display mt-3 text-xl font-semibold">{s.name}</h3>
              <p className="mt-1 font-mono text-sm text-graphite">{s.letters}</p>
              <p className="mt-3 text-sm leading-relaxed text-smoke">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeader
          num="03"
          eyebrow="La destination"
          tone="dark"
          title={
            <>
              Superfans &amp; <span className="text-coral">fenêtre d&apos;Overton</span>
            </>
          }
          lede="La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton de leur secteur. Ces deux mécaniques ne sont pas des KPIs — c'est la mission."
        />
        <div className="mt-12 grid gap-bento md:grid-cols-2">
          <div className="rounded-xl border border-line bg-ink-2 p-7">
            <span className="inline-flex size-11 items-center justify-center rounded-md bg-coral/12 text-coral">
              <Users className="size-5" aria-hidden="true" />
            </span>
            <h3 className="font-display mt-4 text-xl font-semibold">Les superfans</h3>
            <p className="mt-2 text-sm leading-relaxed text-sand">
              La masse stratégique — ambassadeurs et évangélistes — qui produit du travail
              organique pour la marque : elle défend, recrute, transmet. Pas un compteur de
              visiteurs ; une communauté qui s&apos;identifie.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-ink-2 p-7">
            <span className="inline-flex size-11 items-center justify-center rounded-md bg-coral/12 text-coral">
              <Flame className="size-5" aria-hidden="true" />
            </span>
            <h3 className="font-display mt-4 text-xl font-semibold">La fenêtre d&apos;Overton</h3>
            <p className="mt-2 text-sm leading-relaxed text-sand">
              L&apos;axe culturel de votre secteur. Quand la marque le déplace, le secteur se
              redéfinit autour d&apos;elle : elle ne suit plus le standard, elle le fixe. C&apos;est
              la marque ICONE.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader
          num="04"
          eyebrow="La mesure"
          title={
            <>
              Six paliers, un score <span className="text-coral">/{COMPOSITE_MAX_SCORE}</span>
            </>
          }
          lede={
            <>
              La maturité d&apos;une marque se mesure : 8 piliers notés sur {PILLAR_MAX_SCORE}, un
              composite sur {COMPOSITE_MAX_SCORE}, un palier. Le diagnostic gratuit note votre
              socle ADVE sur {DIAGNOSTIC_MAX_SCORE}. Déterministe — même marque, même score, zéro
              boîte noire.
            </>
          }
        />
        <div className="mt-10 grid grid-cols-2 gap-bento sm:grid-cols-3 lg:grid-cols-6">
          {BRAND_LEVELS.map((level, i) => {
            const def = LEVEL_DEFINITIONS[level];
            const apex = level === "ICONE";
            return (
              <div
                key={level}
                className={`flex flex-col gap-2 rounded-lg p-5 ${
                  apex ? "bg-ink text-bone shadow-card-lg" : "bg-white shadow-card"
                }`}
              >
                <p className={`eyebrow ${apex ? "text-gold" : "text-smoke-2"}`}>Palier {i + 1}</p>
                <p className="font-display text-lg font-semibold">{def.label}</p>
                <p className={`font-mono text-lg font-semibold ${apex ? "text-gold" : "text-coral"}`}>
                  {levelRange(level)}
                </p>
                <p className={`text-xs leading-relaxed ${apex ? "text-sand" : "text-smoke"}`}>
                  {def.tagline}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 max-w-2xl text-sm text-smoke">
          Plus on monte, plus chaque point coûte : les bandes se resserrent en approchant de
          l&apos;apex. CULTE, c&apos;est le mouvement formé ; ICONE, c&apos;est le culte cristallisé
          en référence sectorielle.
        </p>
      </Section>

      <Section tone="dark">
        <SectionHeader
          num="05"
          eyebrow="L'obligation d'effet"
          tone="dark"
          title={
            <>
              On vend un <span className="text-coral">état final mesuré</span>.
            </>
          }
          lede="La rupture de positionnement : l'agence à obligation d'effet. On ne vend pas des moyens, on vend un résultat tracé — palier visé, score cible, horizon, gelés à la signature dans un journal immuable."
        />
        <div className="mt-10 grid gap-bento md:grid-cols-3">
          {EFR_POINTS.map((e, i) => (
            <div key={e.title} className="rounded-xl border border-line bg-ink-2 p-7">
              <p className="font-mono text-xs font-semibold text-coral">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="font-display mt-3 text-lg font-semibold">{e.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sand">{e.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <SectionHeader
              num="06"
              eyebrow="Le livrable"
              title={
                <>
                  L&apos;<span className="text-coral">Oracle</span>.
                </>
              }
              lede="La méthode produit un document de conseil dynamique — l'Oracle, la stratégie complète de votre marque en 35 sections, mise à jour à chaque évolution de vos piliers. On l'accouche par un audit ADVE en mandat — ou vous l'essayez en libre-service via La Fusée."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/intake" className={buttonVariants({ size: "md" })}>
                Diagnostic gratuit <ArrowRight />
              </Link>
              <Link href="/contact" className={buttonVariants({ variant: "outline", size: "md" })}>
                Cadrer un audit ADVE
              </Link>
            </div>
          </div>
          <div className="rounded-xl bg-white p-7 shadow-card">
            <p className="eyebrow text-smoke">Ce que contient l&apos;Oracle</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-graphite">
              {[
                "Le diagnostic ADVE — 4 piliers d'identité notés",
                "Le SWOT taillé dans l'ADN (pilier Risque)",
                "La lecture de marché et des signaux faibles (Tracking)",
                "L'éventail d'actions activables (Innovation)",
                "La roadmap dynamique priorisée (Stratégie)",
                `Le score /${COMPOSITE_MAX_SCORE} et le palier de maturité visé`,
              ].map((line) => (
                <li
                  key={line}
                  className="flex gap-3 border-b border-ink/8 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-coral" aria-hidden="true">
                    →
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
