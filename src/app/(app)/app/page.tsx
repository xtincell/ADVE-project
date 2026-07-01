import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Rocket, Sparkles } from "lucide-react";
import { readSession } from "@/lib/session";
import { brandPillarsContent, getBrandForSession, jsonRecord, adveIsEmpty } from "@/server/brand";
import { PILLARS, RTIS_PILLARS, isAdve } from "@/domain/pillars";
import { PILLAR_FIELDS, PILLAR_LABELS } from "@/domain/pillar-fields";
import { COMPOSITE_MAX_SCORE, LEVEL_DEFINITIONS, scoreBrand } from "@/domain/scoring";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionForm } from "@/components/pillars/action-form";
import { certaintyCounts } from "@/components/pillars/certainty";
import { LevelBadge } from "@/components/pillars/level-badge";
import { PillarCard } from "@/components/pillars/pillar-card";
import { ScoreBar } from "@/components/pillars/score-bar";
import { deriveRtisAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ma marque" };

/**
 * Tableau de bord marque : score composite /200 + palier (calculés en direct
 * depuis les piliers réels — le moteur est déterministe, l'affichage ne peut
 * pas dériver de la donnée), grille bento des 8 piliers, dérivation RTIS.
 */
export default async function AppHomePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app");

  const brand = await getBrandForSession(session);

  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Espace marque</p>
          <h1 className="font-display text-3xl font-semibold">Ma marque</h1>
        </header>
        <EmptyState
          icon={<Rocket />}
          title="Aucune marque dans cet espace"
          description="Tout commence par le diagnostic gratuit : il pose le socle ADVE de votre marque — score, palier et premiers champs déclarés."
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
  const socleEmpty = adveIsEmpty(content);
  const rtisDerivedOnce = brand.pillars.some((p) => !isAdve(p.key));

  const certaintyByKey = Object.fromEntries(
    PILLARS.map((key) => {
      const pillar = brand.pillars.find((p) => p.key === key);
      return [
        key,
        certaintyCounts(
          jsonRecord(pillar?.content),
          jsonRecord(pillar?.certainty),
          PILLAR_FIELDS[key],
        ),
      ];
    }),
  );

  return (
    <div className="space-y-10">
      {/* ── Header marque : nom, palier, score /200 ─────────────────── */}
      <header className="space-y-5">
        <div className="space-y-2">
          <p className="eyebrow text-coral">Espace marque</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">{brand.name}</h1>
            <LevelBadge level={score.level} />
          </div>
          <p className="text-sm text-sand">
            {levelDef.tagline}
            {brand.sector ? ` · ${brand.sector}` : ""}
          </p>
        </div>
        <div className="max-w-xl space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-semibold text-sand">Score structurel</span>
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
            Calcul déterministe depuis les champs réellement remplis — aucune note de qualité,
            aucune IA dans la boucle de score.
          </p>
        </div>
      </header>

      {/* ── Grille bento des 8 piliers ───────────────────────────────── */}
      <section className="space-y-4" aria-label="Piliers de la marque">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Les 8 piliers</h2>
            <p className="text-sm text-sand">
              A·D·V·E = socle déclaré. R·T·I·S = dérivés du socle, jamais édités à la main.
            </p>
          </div>
          <ActionForm
            action={deriveRtisAction}
            label={rtisDerivedOnce ? "Re-dériver RTIS depuis le socle" : "Dériver RTIS depuis le socle"}
            pendingLabel="Dérivation…"
            disabled={socleEmpty}
            hint={
              socleEmpty
                ? "Le socle ADVE est vide — complétez au moins un champ avant de dériver."
                : undefined
            }
            variant="outline"
            size="sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-bento sm:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map((key) => {
            const counts = certaintyByKey[key]!;
            return (
              <PillarCard
                key={key}
                pillarKey={key}
                label={PILLAR_LABELS[key]}
                href={`/app/pilier/${key.toLowerCase()}`}
                derived={!isAdve(key)}
                score={score.byPillar[key].score}
                filled={counts.filled}
                total={counts.total}
                declared={counts.declared}
                inferred={counts.inferred}
              />
            );
          })}
        </div>
        {!rtisDerivedOnce && !socleEmpty ? (
          <p className="flex items-center gap-2 text-sm text-sand">
            <Sparkles className="size-4 text-gold" aria-hidden />
            Les piliers R·T·I·S n&apos;ont pas encore été dérivés — lancez la dérivation pour
            obtenir le diagnostic ({RTIS_PILLARS.map((k) => PILLAR_LABELS[k]).join(", ")}).
          </p>
        ) : null}
      </section>
    </div>
  );
}
