import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { readSession } from "@/lib/session";
import {
  brandPillarsContent,
  getBrandForSession,
  getBrandScores,
  scoreDimensions25,
} from "@/server/brand";
import { ADVE_PILLARS, isAdve, PILLARS, type AdvePillarKey } from "@/domain/pillars";
import { getFieldDef, PILLAR_FIELDS, PILLAR_LABELS } from "@/domain/pillar-fields";
import { diagnose } from "@/domain/diagnostic";
import {
  COMPOSITE_MAX_SCORE,
  LEVEL_DEFINITIONS,
  PILLAR_MAX_SCORE,
  scoreBrand,
} from "@/domain/scoring";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LevelBadge } from "@/components/pillars/level-badge";
import { ScoreBar } from "@/components/pillars/score-bar";
import type { BrandLevel } from "@/domain/pillars";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diagnostic" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Delta formaté « +1,2 » / « −0,5 » / null si nul. */
function formatDelta(delta: number): string | null {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return null;
  const abs = Math.abs(rounded).toLocaleString("fr-FR");
  return rounded > 0 ? `+${abs}` : `−${abs}`;
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="font-mono text-xs text-smoke-2">première mesure</span>;
  }
  const label = formatDelta(delta);
  if (label === null) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-smoke-2">
        <Minus className="size-3.5" aria-hidden />
        stable
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${up ? "text-success" : "text-coral"}`}
    >
      {up ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
      {label}
    </span>
  );
}

/**
 * Diagnostic — port de `legacy/(cockpit)/cockpit/brand/diagnostic` +
 * `insights/diagnostics`/`insights/reports`, sur les données v7 réelles :
 * état actuel calculé en direct (moteur déterministe), breakdown par pilier,
 * historique BrandScore persisté (liste + delta), prochaines actions dérivées
 * des champs réellement manquants (`domain/diagnostic`). Zéro LLM, zéro
 * invention : chaque constat cite un champ.
 */
export default async function DiagnosticPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/diagnostic");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Espace marque</p>
          <h1 className="font-display text-3xl font-semibold">Diagnostic</h1>
        </header>
        <EmptyState
          icon={<Activity />}
          title="Aucune marque à diagnostiquer"
          description="Le diagnostic lit les piliers de votre marque — commencez par le diagnostic gratuit d'entrée pour poser le socle ADVE."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const content = brandPillarsContent(brand.pillars);
  const score = scoreBrand(content);
  const levelDef = LEVEL_DEFINITIONS[score.level];
  const history = await getBrandScores(brand.id, 24);

  // Delta par pilier entre les deux derniers scores PERSISTÉS (dimensions Json).
  const latestDims = history[0] ? scoreDimensions25(history[0].dimensions) : {};
  const previousDims = history[1] ? scoreDimensions25(history[1].dimensions) : {};

  // Diagnostic du socle (réutilise le moteur du funnel — même entrée, même sortie).
  const adveAnswers: Partial<Record<AdvePillarKey, Record<string, unknown> | null>> = {};
  for (const key of ADVE_PILLARS) adveAnswers[key] = content[key] ?? null;
  const diag = diagnose({ answers: adveAnswers });

  // Champs manquants par pilier ADVE (liens d'action directs).
  const missingByPillar = ADVE_PILLARS.map((key) => ({
    key,
    missing: diag.byPillar[key].missing
      .map((id) => getFieldDef(key, id))
      .filter((f): f is NonNullable<typeof f> => f !== undefined),
  })).filter((entry) => entry.missing.length > 0);

  return (
    <div className="space-y-10">
      {/* ── État actuel (calculé en direct — jamais en retard) ─────────── */}
      <header className="space-y-5">
        <div className="space-y-2">
          <p className="eyebrow text-coral">Espace marque</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">Diagnostic</h1>
            <LevelBadge level={score.level} />
          </div>
          <p className="text-sm text-sand">
            {brand.name} · {levelDef.tagline}
          </p>
        </div>
        <div className="max-w-xl space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-semibold text-sand">Score structurel actuel</span>
            <span className="font-mono text-2xl font-bold text-bone">
              {score.total}
              <span className="text-sm font-medium text-smoke-2"> /{COMPOSITE_MAX_SCORE}</span>
            </span>
          </div>
          <ScoreBar
            value={score.total}
            max={COMPOSITE_MAX_SCORE}
            label={`Score structurel de ${brand.name}`}
          />
          <p className="text-xs text-smoke-2">
            Calcul déterministe depuis les champs réellement remplis — le même moteur que le
            score persisté à chaque mutation.
          </p>
        </div>
      </header>

      {/* ── Breakdown par pilier ─────────────────────────────────────── */}
      <section className="space-y-4" aria-label="Score par pilier">
        <div>
          <h2 className="font-display text-xl font-semibold">Par pilier</h2>
          <p className="text-sm text-sand">
            Chaque pilier vaut {PILLAR_MAX_SCORE} points. Le delta compare les deux derniers
            scores persistés.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-bento lg:grid-cols-2">
          {PILLARS.map((key) => {
            const p = score.byPillar[key];
            const latest = latestDims[key];
            const previous = previousDims[key];
            const delta =
              latest !== undefined && previous !== undefined ? latest - previous : null;
            return (
              <Link
                key={key}
                href={`/app/pilier/${key.toLowerCase()}`}
                className="group rounded-lg border border-line bg-ink-2 p-4 transition-colors hover:border-coral/50 hover:bg-ink-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-8 items-center justify-center rounded-sm bg-white/6 font-mono text-sm font-bold text-sand-2"
                      aria-hidden
                    >
                      {key}
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold text-bone">
                        {PILLAR_LABELS[key]}
                      </p>
                      <p className="text-xs text-smoke-2">
                        {isAdve(key) ? "Socle" : "Dérivé"} · {p.filled.length}/
                        {PILLAR_FIELDS[key].length} champs
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-bone">
                      {p.score25}
                      <span className="text-xs font-medium text-smoke-2">
                        {" "}
                        /{PILLAR_MAX_SCORE}
                      </span>
                    </p>
                    {delta !== null ? <DeltaChip delta={delta} /> : null}
                  </div>
                </div>
                <ScoreBar
                  value={p.score}
                  max={100}
                  size="sm"
                  className="mt-3"
                  label={`Score du pilier ${PILLAR_LABELS[key]}`}
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Prochaines actions (dérivées des champs manquants) ─────────── */}
      <section className="space-y-4" aria-label="Prochaines actions">
        <div>
          <h2 className="font-display text-xl font-semibold">Prochaines actions</h2>
          <p className="text-sm text-sand">
            Socle ADVE : {diag.score}/100 — priorités dans l&apos;ordre de la cascade
            (A→D→V→E), décisions humaines d&apos;abord.
          </p>
        </div>
        <ol className="space-y-2">
          {diag.next3Actions.map((action, i) => (
            <li
              key={action}
              className="flex items-start gap-3 rounded-lg border border-line bg-ink-2 p-4"
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-coral/15 font-mono text-xs font-bold text-coral"
                aria-hidden
              >
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-sand-2">{action}</p>
            </li>
          ))}
        </ol>

        {missingByPillar.length > 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-ink-0/70 p-5">
            <h3 className="font-display text-base font-semibold text-bone">
              Champs du socle encore vides
            </h3>
            <div className="mt-3 space-y-3">
              {missingByPillar.map(({ key, missing }) => (
                <div key={key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <Link
                    href={`/app/pilier/${key.toLowerCase()}`}
                    className="shrink-0 text-sm font-semibold text-sand underline-offset-2 hover:text-bone hover:underline"
                  >
                    {PILLAR_LABELS[key]} ({key}) →
                  </Link>
                  <span className="text-sm text-smoke-2">
                    {missing.map((f) => f.label).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-sand">
            Le socle ADVE est entièrement renseigné — place à la dérivation RTIS et à
            l&apos;Oracle.
          </p>
        )}
      </section>

      {/* ── Historique des scores persistés ─────────────────────────── */}
      <section className="space-y-4" aria-label="Historique des scores">
        <div>
          <h2 className="font-display text-xl font-semibold">Historique</h2>
          <p className="text-sm text-sand">
            Un score est persisté à chaque mutation de pilier — l&apos;historique est
            append-only, jamais réécrit.
          </p>
        </div>
        {history.length === 0 ? (
          <EmptyState
            title="Aucun score persisté"
            description="Le premier score sera enregistré à la première écriture de pilier (amendement, dérivation RTIS ou brouillon IA)."
          />
        ) : (
          <ul className="divide-y divide-line-soft rounded-lg border border-line bg-ink-2">
            {history.map((row, i) => {
              const previous = history[i + 1];
              const delta = previous ? row.total - previous.total : null;
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                  <span className="font-mono text-sm text-smoke-2">
                    {DATE_FORMAT.format(row.computedAt)}
                  </span>
                  <span className="font-mono text-base font-bold text-bone">
                    {row.total}
                    <span className="text-xs font-medium text-smoke-2">
                      {" "}
                      /{COMPOSITE_MAX_SCORE}
                    </span>
                  </span>
                  <LevelBadge level={row.level as BrandLevel} />
                  <span className="ml-auto">
                    <DeltaChip delta={delta} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
