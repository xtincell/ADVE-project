import { PILLAR_STORAGE_KEYS } from "@/domain";

"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Lightbulb, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

const PILLAR_KEYS: PillarKey[] = [...PILLAR_STORAGE_KEYS];

/** Maps each pillar to its relevant learning page */
const PILLAR_LEARN_LINKS: Record<PillarKey, string> = {
  a: "/creator/learn/adve",
  d: "/creator/learn/drivers",
  v: "/creator/learn/adve",
  e: "/creator/learn/adve",
  r: "/creator/learn/risk",
  t: "/creator/learn/tracking",
  i: "/creator/learn/implementation",
  s: "/creator/learn/strategy",
};

const PILLAR_DESCRIPTIONS: Record<PillarKey, string> = {
  a: "Capacité à refléter l'identité et les valeurs profondes de la marque dans chaque livrable.",
  d: "Aptitude à créer du contenu unique qui se démarque de la concurrence.",
  v: "Compétence à articuler et communiquer la proposition de valeur clairement.",
  e: "Talent pour créer du contenu qui suscite l'émotion et l'action.",
  r: "Vigilance à identifier et éviter les risques réputationnels.",
  t: "Rigueur dans l'intégration de mécanismes de mesure et de suivi.",
  i: "Excellence dans l'exécution technique et le respect des spécifications.",
  s: "Vision stratégique et cohérence avec les objectifs long terme.",
};

const PILLAR_COLORS: Record<PillarKey, string> = {
  a: "bg-purple-500",
  d: "bg-blue-500",
  v: "bg-emerald-500",
  e: "bg-amber-500",
  r: "bg-red-500",
  t: "bg-sky-500",
  i: "bg-orange-500",
  s: "bg-pink-500",
};

const PILLAR_RECOMMENDATIONS: Record<PillarKey, string[]> = {
  a: [
    "Étudiez l'histoire de la marque avant chaque mission",
    "Intégrez la voix authentique du client dans chaque livrable",
    "Évitez les formulations génériques",
  ],
  d: [
    "Analysez les livrables concurrents pour trouver un angle unique",
    "Proposez des concepts visuels différenciants",
    "Renforcez le positionnement distinct de la marque",
  ],
  v: [
    "Articulez clairement la proposition de valeur",
    "Mettez en avant les bénéfices concrets pour l'audience",
    "Testez vos messages avec le framework valeur perçue",
  ],
  e: [
    "Intégrez des call-to-action engageants",
    "Créez du contenu qui suscite l'émotion",
    "Utilisez le storytelling pour renforcer la connexion",
  ],
  r: [
    "Identifiez les risques réputationnels avant soumission",
    "Respectez les guidelines légales et éthiques",
    "Anticipez les réactions négatives possibles",
  ],
  t: [
    "Définissez des KPIs mesurables pour chaque livrable",
    "Incluez des mécanismes de tracking (UTM, QR codes...)",
    "Proposez un plan de mesure dans vos briefs",
  ],
  i: [
    "Respectez scrupuleusement les formats et specs techniques",
    "Livrez avec les fichiers sources organisés",
    "Testez vos livrables sur tous les supports cibles",
  ],
  s: [
    "Alignez chaque livrable avec la stratégie globale de la marque",
    "Vérifiez la cohérence cross-canal",
    "Pensez à long terme, pas juste au deliverable du jour",
  ],
};

function getStrengthLevel(score: number): { label: string; color: string } {
  if (score >= 20) return { label: "Expert", color: "text-emerald-400" };
  if (score >= 15) return { label: "Confirmé", color: "text-blue-400" };
  if (score >= 10) return { label: "Intermédiaire", color: "text-amber-400" };
  return { label: "Débutant", color: "text-red-400" };
}

export default function StrengthsPage() {
  const profile = trpc.guilde.getMyProfile.useQuery();
  const reviews = trpc.qualityReview.list.useQuery({ limit: 50 });

  if (profile.isLoading) return <SkeletonPage />;

  // Extract advertis_vector from talent profile
  const profileVector = profile.data?.advertis_vector as Partial<Record<PillarKey, number>> | null;

  // Also aggregate pillar scores from reviews as fallback
  const allReviews = reviews.data?.items ?? [];
  const pillarAverages: Record<PillarKey, number[]> = Object.fromEntries(
    PILLAR_KEYS.map((k) => [k, []])
  ) as unknown as Record<PillarKey, number[]>;

  for (const r of allReviews) {
    const scores = r.pillarScores as Record<string, number> | null;
    if (!scores) continue;
    for (const k of PILLAR_KEYS) {
      if (scores[k] != null) pillarAverages[k].push(scores[k]);
    }
  }

  // Use profile vector if available, else compute from reviews
  const avgScores: Partial<Record<PillarKey, number>> = {};
  for (const k of PILLAR_KEYS) {
    if (profileVector && profileVector[k] != null) {
      avgScores[k] = profileVector[k];
    } else {
      const vals = pillarAverages[k];
      avgScores[k] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 12.5;
    }
  }

  // Pillars to develop (below 15)
  const weakPillars = PILLAR_KEYS.filter((k) => (avgScores[k] ?? 0) < 15);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forces"
        description="Votre profil de compétences sur les 8 piliers ADVE-RTIS"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Progression" },
          { label: "Forces" },
        ]}
      />

      {/* AdvertisRadar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <h3 className="mb-4 font-semibold text-white">Vecteur ADVE-RTIS personnel</h3>
        <div className="flex justify-center">
          <AdvertisRadar scores={avgScores} maxScore={25} size={320} />
        </div>
      </div>

      {/* 8 Pillar Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PILLAR_KEYS.map((key) => {
          const score = avgScores[key] ?? 12.5;
          const strength = getStrengthLevel(score);
          const pct = (score / 25) * 100;

          return (
            <div
              key={key}
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-lg font-bold text-zinc-200">
                    {key.toUpperCase()}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{PILLAR_NAMES[key]}</h4>
                    <span className={`text-xs font-medium ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-bold text-zinc-200">{score.toFixed(1)}/25</span>
              </div>

              <p className="mt-2 text-xs text-zinc-500">{PILLAR_DESCRIPTIONS[key]}</p>

              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${PILLAR_COLORS[key]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations: pillars to develop */}
      {weakPillars.length > 0 && (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-amber-400">Piliers à développer</h3>
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-400">
              score &lt; 15/25
            </span>
          </div>
          <div className="space-y-4">
            {weakPillars.map((key) => {
              const score = avgScores[key] ?? 0;
              const recommendations = PILLAR_RECOMMENDATIONS[key];

              return (
                <div
                  key={key}
                  className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-400">
                        {key.toUpperCase()}
                      </span>
                      <span className="text-sm text-zinc-300">
                        {PILLAR_NAMES[key]}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-amber-400">
                      {score.toFixed(1)}/25
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={PILLAR_LEARN_LINKS[key]}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    En savoir plus sur le pilier {key.toUpperCase()}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
