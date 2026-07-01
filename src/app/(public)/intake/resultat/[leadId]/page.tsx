import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Rocket, X } from "lucide-react";
import { ADVE_PILLARS } from "@/domain/pillars";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import { LEVEL_DEFINITIONS, nextLevel } from "@/domain/scoring";
import { getLeadDiagnostic } from "@/server/funnel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * /intake/resultat/[leadId] — LA page de conversion du funnel. Relit le lead
 * et RECALCULE le diagnostic (déterministe — rien de dérivé n'est stocké).
 * Lead inexistant → 404. Page DB → rendu dynamique uniquement (jamais au build).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre diagnostic ADVE",
  description:
    "Score /100, palier projeté, forces, angles morts et 3 prochaines actions de votre marque.",
  robots: { index: false }, // page personnelle liée à un lead — hors index
};

const HIGH_LEVELS = new Set(["FORTE", "CULTE", "ICONE"]);

function ScoreGauge({ score }: { score: number }) {
  const deg = Math.max(0, Math.min(100, score)) * 3.6;
  return (
    <div
      className="relative size-48 shrink-0 rounded-full sm:size-56"
      style={{
        background: `conic-gradient(var(--color-coral) ${deg}deg, rgba(255, 255, 255, 0.09) ${deg}deg)`,
      }}
      role="img"
      aria-label={`Score du socle ADVE : ${score} sur 100`}
    >
      <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full bg-ink-2">
        <span className="font-display text-6xl font-semibold leading-none text-bone">
          {score}
        </span>
        <span className="mt-1 text-sm font-medium text-sand">/ 100</span>
      </div>
    </div>
  );
}

export default async function ResultatPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const result = await getLeadDiagnostic(leadId);
  if (!result) notFound();

  const { lead, secteur, countryName, diagnostic } = result;
  const levelDef = LEVEL_DEFINITIONS[diagnostic.level];
  const next = nextLevel(diagnostic.level);
  const converted = lead.status === "CONVERTED";
  const meta = [
    secteur,
    countryName,
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(lead.createdAt),
  ].filter(Boolean);

  return (
    <div className="bg-bone">
      {/* ── Hero score — panda sombre, jauge + palier ─────────────────── */}
      <section className="texture-geo bg-ink text-bone">
        <div className="mx-auto max-w-page px-gutter py-14 sm:py-20">
          <p className="eyebrow text-coral">Diagnostic ADVE · résultat</p>
          <h1 className="font-display mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            {lead.brandName}
          </h1>
          {meta.length > 0 ? (
            <p className="mt-2 text-sm text-sand">{meta.join(" · ")}</p>
          ) : null}

          <div className="mt-10 flex flex-col items-start gap-10 sm:flex-row sm:items-center">
            <ScoreGauge score={diagnostic.score} />
            <div className="max-w-xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={HIGH_LEVELS.has(diagnostic.level) ? "gold" : "coral"}>
                  Palier projeté · {levelDef.label}
                </Badge>
                <span className="text-sm text-sand">{diagnostic.levelLabel}</span>
              </div>
              <p className="text-base leading-relaxed text-sand-2">
                {levelDef.signals}
              </p>
              {next ? (
                <p className="text-sm text-sand">
                  Prochain palier :{" "}
                  <span className="font-semibold text-bone">
                    {LEVEL_DEFINITIONS[next].label}
                  </span>{" "}
                  — {LEVEL_DEFINITIONS[next].tagline.toLowerCase()}.
                </p>
              ) : null}
            </div>
          </div>

          {/* Détail par pilier — 4 barres du socle */}
          <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
            {ADVE_PILLARS.map((key) => {
              const p = diagnostic.byPillar[key];
              return (
                <div
                  key={key}
                  className="rounded-lg border border-line bg-ink-2 p-5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-sand-2">
                      <span className="text-coral">{key}</span> · {PILLAR_LABELS[key]}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-sand">
                      {p.score}/100
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-coral"
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-smoke-2">
                    {p.filled.length} champ{p.filled.length > 1 ? "s" : ""} renseigné
                    {p.filled.length > 1 ? "s" : ""} sur {p.filled.length + p.missing.length}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Constats + actions — bento clair ──────────────────────────── */}
      <section className="mx-auto max-w-page px-gutter py-14 sm:py-20">
        <div className="grid gap-bento lg:grid-cols-2">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Vos forces</CardTitle>
            </CardHeader>
            {diagnostic.forces.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {diagnostic.forces.map((force) => (
                  <li key={force} className="flex items-start gap-3 text-sm leading-relaxed text-graphite">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {force}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-relaxed text-smoke">
                Aucune force constatée pour l&apos;instant — rien d&apos;étonnant :
                le socle est encore à poser. Chaque champ que vous déclarerez
                deviendra un actif mesurable.
              </p>
            )}
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Vos angles morts</CardTitle>
            </CardHeader>
            {diagnostic.faiblesses.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {diagnostic.faiblesses.map((faiblesse) => (
                  <li key={faiblesse} className="flex items-start gap-3 text-sm leading-relaxed text-graphite">
                    <X className="mt-0.5 size-4 shrink-0 text-coral-deep" aria-hidden="true" />
                    {faiblesse}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-relaxed text-smoke">
                Aucun champ vide sur le socle ADVE — la suite se joue sur les
                piliers dérivés (RTIS) et l&apos;exécution.
              </p>
            )}
          </Card>

          <Card tone="dark" padding="lg" className="lg:col-span-2">
            <CardHeader>
              <p className="eyebrow text-coral">Par où commencer</p>
              <CardTitle className="text-2xl text-bone">
                Vos 3 prochaines actions
              </CardTitle>
            </CardHeader>
            <ol className="mt-6 space-y-4">
              {diagnostic.next3Actions.map((action, i) => (
                <li key={action} className="flex items-start gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-coral/15 font-mono text-sm font-bold text-coral">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-sand-2">{action}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* ── CTA conversion ───────────────────────────────────────────── */}
        <Card
          tone="dark"
          padding="lg"
          className="texture-geo relative mt-10 overflow-hidden text-center sm:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-[-8%] h-72 w-72 rounded-full bg-coral/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <span className="inline-flex size-12 items-center justify-center rounded-md bg-coral/15 text-coral">
              <Rocket className="size-6" aria-hidden="true" />
            </span>
            <h2 className="font-display text-3xl font-semibold text-bone sm:text-4xl">
              {converted
                ? "Ce diagnostic a déjà son Cockpit."
                : "Transformez ce diagnostic en plan de vol."}
            </h2>
            <p className="text-base leading-relaxed text-sand">
              {converted
                ? "Le socle ADVE de cette marque a été importé dans son espace. Connectez-vous pour le piloter."
                : "Créez votre Cockpit : vos réponses deviennent le socle ADVE de votre marque — rien à re-saisir. Vous suivez votre score, complétez vos angles morts et débloquez vos livrables."}
            </p>
            {converted ? (
              <Link
                href="/connexion"
                className={buttonVariants({ size: "lg" })}
              >
                Se connecter à mon espace <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <Link
                href={`/inscription?lead=${lead.id}`}
                className={buttonVariants({ size: "lg" })}
              >
                Créer mon Cockpit — gratuit <ArrowRight aria-hidden="true" />
              </Link>
            )}
            {!converted ? (
              <p className="text-xs text-smoke-2">
                Sans engagement — le Cockpit démarre gratuitement.
              </p>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
