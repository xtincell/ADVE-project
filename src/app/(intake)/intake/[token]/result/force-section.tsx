// ============================================================================
// Quick Intake Result — Force de marque (nouveau scoreur, ADR-0149)
// ============================================================================
// Note de FORCE mesurée sur la preuve publique captée (empreinte) — jamais le
// déclaratif. Lecture SEULE (aucune écriture au classement). Honnête (ADR-0046) :
// une force nulle / une couverture partielle est DITE, avec ce qui la révèle.
// Vocabulaire client (ADR-0123) : « force », « terrains », « palier » — aucun
// jargon interne (« arène », « épreuve », « scoreur »).
// ============================================================================

"use client";

import { trpc } from "@/lib/trpc/client";
import { Gauge, Lock, TrendingUp, Trophy } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";

// i18n keys — resolved with t() at render time (fragment intake-result.ts).
const TIER_TAGLINE: Record<string, string> = {
  LATENT: "intakeResult.force.tier.LATENT",
  FRAGILE: "intakeResult.force.tier.FRAGILE",
  ORDINAIRE: "intakeResult.force.tier.ORDINAIRE",
  FORTE: "intakeResult.force.tier.FORTE",
  CULTE: "intakeResult.force.tier.CULTE",
  ICONE: "intakeResult.force.tier.ICONE",
};

export function ForceSection({ token }: { token: string }) {
  const { t } = useT();
  const { data, isLoading } = trpc.quickIntake.getForceByToken.useQuery(
    { token },
    { staleTime: 60_000, retry: 1 },
  );

  // Pas encore de marque rattachée / calcul indisponible → on n'affiche rien
  // (le reste du rapport porte déjà la valeur ; jamais un bloc mort).
  if (isLoading) {
    return (
      <section className="mb-10 print:hidden">
        <div className="h-40 animate-pulse rounded-2xl border border-border-subtle bg-card" />
      </section>
    );
  }
  if (!data || data.status !== "OK") return null;

  const { force, outOf, tier, coveragePct, measuredArenas, totalArenas, terrains, nextUnlock } = data;
  const hasEvidence = measuredArenas > 0;

  return (
    <section className="mb-10 print:hidden">
      <header className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Gauge className="h-4 w-4 text-primary" />
          {t("intakeResult.force.title")}
        </h2>
        <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
          {t("intakeResult.force.badge")}
        </span>
      </header>
      <p className="mb-4 text-sm text-foreground-muted">
        {t("intakeResult.force.subBefore")} <span className="font-medium text-foreground">{t("intakeResult.force.subHighlight")}</span>{" "}
        {t("intakeResult.force.subAfter")}
      </p>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        {/* Palier + force */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-primary">{t("intakeResult.force.revealedTier")}</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{tier}</span>
              <span className="text-sm text-foreground-muted">{TIER_TAGLINE[tier] ? t(TIER_TAGLINE[tier]!) : ""}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xs font-medium uppercase tracking-wider text-foreground-muted">{t("intakeResult.force.force")}</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {force}
              <span className="text-sm font-normal text-foreground-muted"> / {outOf}</span>
            </p>
          </div>
        </div>

        {/* Couverture de la mesure — l'honnêteté centrale */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-2xs font-semibold uppercase tracking-widest text-foreground-muted">
            <span>{t("intakeResult.force.coverage")}</span>
            <span className="tabular-nums">{measuredArenas}/{totalArenas} {t("intakeResult.force.arenas")} · {coveragePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background-raised">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, coveragePct)}%` }} />
          </div>
        </div>

        {/* Terrains mesurés (les 5 dimensions) */}
        <ul className="mt-5 space-y-2">
          {terrains.map((terrain) => (
            <li key={terrain.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <span className="text-sm text-foreground">{terrain.label}</span>
              {terrain.measured ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-background-raised">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (terrain.force / 25) * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-foreground-muted">{terrain.force}</span>
                </div>
              ) : (
                <span className="text-xs text-foreground-muted">{t("intakeResult.force.notMeasured")}</span>
              )}
            </li>
          ))}
        </ul>

        {/* Ce qui débloque le palier suivant — actionnable, jamais un mur */}
        {nextUnlock.length > 0 && (
          <div className="mt-5 rounded-xl border border-primary/30 bg-primary-subtle/20 p-4">
            <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("intakeResult.force.nextUnlock")}
            </p>
            <ul className="mt-2 space-y-1">
              {nextUnlock.map((u, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {u}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasEvidence && (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-foreground-muted">
            {t("intakeResult.force.noEvidence")}
          </p>
        )}

        {/* Classement public : consultable librement, y figurer est un choix (payant / opérateur) */}
        <p className="mt-4 flex items-center gap-1.5 border-t border-border-subtle pt-4 text-xs text-foreground-muted">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          <a href="/leaderboard" className="text-primary underline-offset-2 hover:underline">
            {t("intakeResult.force.leaderboard")}
          </a>
          <Lock className="h-3 w-3" />
          {t("intakeResult.force.leaderboardLock")}
        </p>
      </div>
    </section>
  );
}
