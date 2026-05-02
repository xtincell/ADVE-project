"use client";

import { Shield, Star, Crown, Gem, CheckCircle, Lock, ArrowUpCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { TierBadge } from "@/components/shared/tier-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const TIER_ORDER: GuildTier[] = ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"];

const TIER_CONFIG: Record<GuildTier, {
  icon: typeof Shield;
  color: string;
  bg: string;
  border: string;
  requirements: { label: string; key: string; target: number; suffix?: string }[];
  perks: string[];
}> = {
  APPRENTI: {
    icon: Shield,
    color: "text-foreground-secondary",
    bg: "bg-surface-raised",
    border: "border-border",
    requirements: [],
    perks: [
      "Accès aux missions DISPATCH",
      "Formation ADVE de base",
      "Support communautaire",
    ],
  },
  COMPAGNON: {
    icon: Star,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-800",
    requirements: [
      { label: "Missions complétées", key: "missions", target: 10 },
      { label: "Taux 1er jet (FPR)", key: "firstPass", target: 70, suffix: "%" },
      { label: "Score QC moyen", key: "avgScore", target: 6 },
    ],
    perks: [
      "Missions collaboratives",
      "Tarifs COMPAGNON (+20%)",
      "Peer review accessible",
      "Badge Compagnon",
    ],
  },
  MAITRE: {
    icon: Crown,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning",
    requirements: [
      { label: "Missions complétées", key: "missions", target: 30 },
      { label: "Taux 1er jet (FPR)", key: "firstPass", target: 80, suffix: "%" },
      { label: "Score QC moyen", key: "avgScore", target: 7.5 },
      { label: "Missions collaboratives", key: "collabMissions", target: 5 },
    ],
    perks: [
      "Peer reviewer officiel",
      "Tarifs MAITRE (+40%)",
      "Mentorat apprentis",
      "Accès webinaires exclusifs",
      "Compensation QC",
    ],
  },
  ASSOCIE: {
    icon: Gem,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-800",
    requirements: [
      { label: "Missions complétées", key: "missions", target: 60 },
      { label: "Taux 1er jet (FPR)", key: "firstPass", target: 90, suffix: "%" },
      { label: "Score QC moyen", key: "avgScore", target: 8.5 },
      { label: "Missions collaboratives", key: "collabMissions", target: 15 },
      { label: "Peer reviews effectuées", key: "peerReviews", target: 10 },
    ],
    perks: [
      "Strategic partner",
      "Tarifs ASSOCIE (+60%)",
      "Brief enrichment",
      "Formation des formateurs",
      "Revenus partagés sur mentorat",
      "Accès au conseil de guilde",
    ],
  },
};

export default function ProgressPathPage() {
  const profile = trpc.guilde.getMyProfile.useQuery();
  const promotion = trpc.guildTier.checkPromotion.useQuery(
    { talentProfileId: profile.data?.id ?? "" },
    { enabled: !!profile.data?.id }
  );

  if (profile.isLoading) return <SkeletonPage />;

  const currentTier = (profile.data?.tier ?? "APPRENTI") as GuildTier;
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const totalMissions = profile.data?.totalMissions ?? 0;
  const firstPassRate = (profile.data?.firstPassRate ?? 0) * 100;
  const avgScore = profile.data?.avgScore ?? 0;

  const userProgress: Record<string, number> = {
    missions: totalMissions,
    firstPass: firstPassRate,
    avgScore,
    peerReviews: profile.data?.peerReviews ?? 0,
    collabMissions: profile.data?.collabMissions ?? 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcours"
        description="Votre chemin vers l'excellence créative"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Progression" },
          { label: "Parcours" },
        ]}
      >
        <TierBadge tier={currentTier} size="lg" />
      </PageHeader>

      {/* Current tier display */}
      <div className="rounded-xl border border-border bg-background/80 p-5">
        <div className="flex items-center gap-4">
          <TierBadge tier={currentTier} size="lg" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Votre tier actuel</h3>
            <p className="text-sm text-foreground-secondary">
              {currentTier === "ASSOCIE"
                ? "Vous avez atteint le plus haut niveau de la guilde."
                : `Prochain objectif : ${TIER_ORDER[currentIndex + 1]}`}
            </p>
          </div>
        </div>
      </div>

      {/* Promotion status */}
      {promotion.data && (() => {
        const eval_ = promotion.data;
        const isPromotable = eval_.recommendation === "PROMOTE";
        const allCriteriaMet = Object.values(eval_.criteria).every((c) => c.met);
        const unmetCount = Object.values(eval_.criteria).filter((c) => !c.met).length;
        return (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              isPromotable
                ? "border-success bg-success/30"
                : "border-border bg-background/60"
            }`}
          >
            <ArrowUpCircle
              className={`h-5 w-5 ${isPromotable ? "text-success" : "text-foreground-muted"}`}
            />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isPromotable ? "text-success" : "text-foreground-secondary"}`}>
                {isPromotable
                  ? `Eligible pour promotion vers ${eval_.suggestedTier}`
                  : allCriteriaMet
                    ? "Evaluation en cours"
                    : `${unmetCount} critere(s) restant(s) pour la prochaine promotion`}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {Object.entries(eval_.criteria).map(([key, c]) => (
                  <span key={key} className={`text-[10px] ${c.met ? "text-success" : "text-foreground-muted"}`}>
                    {key}: {c.actual}/{c.required} {c.met ? "✓" : ""}
                  </span>
                ))}
              </div>
            </div>
            {isPromotable && (
              <a
                href={`/creator/progress/promotion-request?tier=${eval_.suggestedTier}`}
                className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-success"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Demander une evaluation
              </a>
            )}
          </div>
        );
      })()}

      {/* Progression stepper */}
      <div className="flex items-center justify-center gap-2 py-4">
        {TIER_ORDER.map((tier, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const config = TIER_CONFIG[tier];
          const Icon = config.icon;

          return (
            <div key={tier} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "border-success bg-success/20"
                      : isCurrent
                        ? `${config.border} ${config.bg} ring-2 ring-offset-2 ring-offset-zinc-950 ring-current`
                        : "border-border bg-background/50"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-success" />
                  ) : (
                    <Icon
                      className={`h-6 w-6 ${isCurrent ? config.color : "text-foreground-muted"}`}
                    />
                  )}
                </div>
                <span className={`text-xs font-medium ${isCurrent ? "text-white" : "text-foreground-muted"}`}>
                  {tier}
                </span>
              </div>
              {i < TIER_ORDER.length - 1 && (
                <div
                  className={`h-0.5 w-12 sm:w-20 lg:w-28 ${
                    i < currentIndex ? "bg-success" : "bg-surface-raised"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Tier details with requirements */}
      <div className="space-y-4">
        {TIER_ORDER.map((tier, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLocked = i > currentIndex;
          const config = TIER_CONFIG[tier];
          const Icon = config.icon;

          return (
            <div
              key={tier}
              className={`rounded-xl border p-5 transition-all ${
                isCurrent
                  ? `${config.border} ${config.bg}`
                  : isCompleted
                    ? "border-border bg-background/60 opacity-75"
                    : "border-border bg-background/40 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isCurrent ? config.color : "text-foreground-muted"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{tier}</h3>
                      {isCompleted && (
                        <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          <CheckCircle className="h-3 w-3" /> Validé
                        </span>
                      )}
                      {isCurrent && (
                        <span className={`rounded-full ${config.bg} px-2 py-0.5 text-xs font-medium ${config.color}`}>
                          En cours
                        </span>
                      )}
                      {isLocked && (
                        <span className="flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground-muted">
                          <Lock className="h-3 w-3" /> Verrouillé
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements with progress bars */}
              {config.requirements.length > 0 && (isCurrent || isLocked) && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                    Conditions requises
                  </h4>
                  {config.requirements.map((req) => {
                    const current = userProgress[req.key] ?? 0;
                    const met = current >= req.target;
                    const pct = Math.min((current / req.target) * 100, 100);

                    return (
                      <div key={req.key} className="flex items-center gap-3">
                        <div className="w-44 text-xs text-foreground-secondary">{req.label}</div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-background">
                            <div
                              className={`h-full rounded-full transition-all ${
                                met ? "bg-success" : "bg-surface-elevated"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className={`w-24 text-right text-xs font-medium ${met ? "text-success" : "text-foreground-muted"}`}>
                          {typeof current === "number" && current % 1 !== 0
                            ? current.toFixed(1)
                            : current}
                          {req.suffix ?? ""}/{req.target}{req.suffix ?? ""}
                        </span>
                        {met && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Perks */}
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                  Avantages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {config.perks.map((perk) => (
                    <span
                      key={perk}
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        isCompleted || isCurrent
                          ? "bg-background text-foreground-secondary"
                          : "bg-background/50 text-foreground-muted"
                      }`}
                    >
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
