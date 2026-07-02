import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { BRAND_LEVELS, PILLARS, isAdve, type BrandLevel } from "@/domain/pillars";
import {
  COMPOSITE_MAX_SCORE,
  LEVEL_DEFINITIONS,
  LEVEL_UPPER_BOUNDS_200,
  PILLAR_MAX_SCORE,
  STRUCTURAL_WEIGHTS,
} from "@/domain/scoring";
import { DIAGNOSTIC_MAX_SCORE } from "@/domain/diagnostic";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PILLAR_QUESTIONS } from "@/components/marketing/site-data";

export const metadata: Metadata = {
  title: "Le score de marque /200",
  description:
    "Le standard de mesure de La Fusée : 8 piliers notés /25, un score composite /200, six paliers de LATENT à ICONE. Déterministe et transparent — mesurez votre marque gratuitement.",
};

/**
 * /intake/score — page publique de référence du score (port de
 * legacy/(intake)/score « Score Reference Page »). Recâblée sur les
 * constantes canon v7 : 6 paliers (le legacy en affichait 5, sans FRAGILE)
 * avec les bornes réelles LEVEL_UPPER_BOUNDS_200, formule structurelle
 * 15/7/3 réelle, questions par pilier partagées avec le radar /lafusee.
 * C'est aussi la page d'atterrissage des liens de score morts
 * (/intake/score/[leadId] introuvable → redirection ici).
 */

/** Bande de score réelle d'un palier sur l'échelle /200 (bornes canon). */
function levelRange(level: BrandLevel): string {
  if (level === "ICONE") return `${LEVEL_UPPER_BOUNDS_200.CULTE + 1}–${COMPOSITE_MAX_SCORE}`;
  const upper = LEVEL_UPPER_BOUNDS_200[level];
  const i = BRAND_LEVELS.indexOf(level);
  const prev = i > 0 ? BRAND_LEVELS[i - 1] : undefined;
  if (!prev || prev === "ICONE") return `0–${upper}`;
  return `${LEVEL_UPPER_BOUNDS_200[prev] + 1}–${upper}`;
}

export default function ScoreReferencePage() {
  return (
    <div className="bg-bone">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="texture-geo bg-ink text-bone">
        <div className="mx-auto max-w-page px-gutter py-14 sm:py-20">
          <p className="eyebrow text-coral">Référence · le score de marque</p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-5xl">
            Huit piliers. Une note.{" "}
            <span className="text-coral">/{COMPOSITE_MAX_SCORE}.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sand">
            Le standard de mesure de la force de marque dans La Fusée : chaque
            pilier est noté /{PILLAR_MAX_SCORE}, le composite classe la marque
            sur six paliers, de LATENT à ICONE. Déterministe et transparent —
            même marque, même score, toujours.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/intake" className={buttonVariants({ size: "md" })}>
              Mesurer ma marque gratuitement <ArrowRight />
            </Link>
            <Link
              href="/methode"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              La méthode ADVE/RTIS
            </Link>
          </div>
        </div>
      </section>

      {/* ── Les 6 paliers ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-page px-gutter py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">La classification</p>
          <h2 className="font-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Six paliers, <span className="text-coral">une seule direction</span>.
          </h2>
          <p className="mt-4 text-lg text-graphite">
            Le score dit où vous êtes ; chaque palier a ses signaux
            observables. Plus on monte, plus la bande se resserre — chaque
            point coûte davantage.
          </p>
        </div>
        <div className="mt-10 grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
          {BRAND_LEVELS.map((level) => {
            const def = LEVEL_DEFINITIONS[level];
            const apex = level === "ICONE";
            return (
              <div
                key={level}
                className={`rounded-lg p-6 ${
                  apex ? "bg-ink text-bone" : "bg-white shadow-card"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`font-display text-2xl font-semibold ${
                      apex ? "text-gold" : "text-coral"
                    }`}
                  >
                    {def.label}
                  </p>
                  <p className={`font-mono text-xs tabular-nums ${apex ? "text-sand" : "text-smoke"}`}>
                    {levelRange(level)}
                  </p>
                </div>
                <p className={`mt-1 text-sm font-semibold ${apex ? "text-sand-2" : "text-graphite"}`}>
                  {def.tagline}
                </p>
                <p className={`mt-3 text-sm leading-relaxed ${apex ? "text-sand" : "text-smoke"}`}>
                  {def.signals}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Les 8 piliers + formule ──────────────────────────────────── */}
      <section className="texture-geo bg-ink-0 text-bone">
        <div className="mx-auto max-w-page px-gutter py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow text-coral">Les 8 piliers</p>
              <h2 className="font-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                4 déclarés, <span className="text-coral">4 dérivés</span>.
              </h2>
              <p className="mt-4 text-lg text-sand">
                Chaque pilier est noté sur {PILLAR_MAX_SCORE} points. Les 4
                premiers (ADVE) définissent l&apos;ADN de votre marque — vous
                les déclarez. Les 4 suivants (RTIS) sont dérivés du socle par
                l&apos;OS, jamais édités à la main.
              </p>
            </div>
            <div className="flex gap-2 pb-1">
              <Badge variant="coral">ADVE — déclaré</Badge>
              <Badge variant="inverse">RTIS — dérivé</Badge>
            </div>
          </div>
          <div className="mt-10 grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((key) => (
              <div key={key} className="rounded-lg border border-line bg-ink-2 p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-display flex size-10 items-center justify-center rounded-md text-lg font-semibold ${
                      isAdve(key)
                        ? "bg-coral text-white"
                        : "border border-line bg-transparent text-sand-2"
                    }`}
                  >
                    {key}
                  </span>
                  <p className="font-bold text-bone">{PILLAR_LABELS[key]}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-sand">
                  {PILLAR_QUESTIONS[key]}
                </p>
              </div>
            ))}
          </div>

          {/* Formule réelle du moteur — mêmes constantes que le produit. */}
          <div className="mt-8 rounded-lg border border-line bg-ink-2 p-6">
            <p className="eyebrow text-smoke">La formule — sans boîte noire</p>
            <p className="mt-3 font-mono text-sm leading-relaxed text-sand-2">
              score pilier /{PILLAR_MAX_SCORE} = présence des champs (
              {STRUCTURAL_WEIGHTS.atoms}) + complétude des listes (
              {STRUCTURAL_WEIGHTS.collections}) + profondeur (
              {STRUCTURAL_WEIGHTS.crossRefs})
              <br />
              score composite = A + D + V + E + R + T + I + S → /{COMPOSITE_MAX_SCORE}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-sand">
              Le scoring est structurel et déterministe — il mesure ce qui est
              déclaré et sa profondeur, sans jugement de fond ni IA dans le
              chemin de calcul. Le diagnostic gratuit note le socle ADVE seul,
              sur {DIAGNOSTIC_MAX_SCORE} ; les piliers dérivés s&apos;y
              ajoutent dans le Cockpit.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-page px-gutter py-14 text-center sm:py-20">
        <span className="inline-flex size-12 items-center justify-center rounded-md bg-coral/12 text-coral">
          <Rocket className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-display mx-auto mt-5 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Et votre marque, <span className="text-coral">elle est où</span> ?
        </h2>
        <div className="mt-7">
          <Link href="/intake" className={buttonVariants({ size: "lg" })}>
            Mesurer ma marque gratuitement <ArrowRight />
          </Link>
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-smoke">
          15 minutes · gratuit · confidentiel · score instantané
        </p>
      </section>
    </div>
  );
}
