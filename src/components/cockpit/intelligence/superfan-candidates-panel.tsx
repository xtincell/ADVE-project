"use client";

/**
 * <SuperfanCandidatesPanel /> — fans détectés dans les interactions réelles
 * (commentaires des réseaux connectés), pas encore suivis (ADR-0134 §B4).
 *
 * Surface OPÉRATEUR uniquement : la liste porte des identités publiques de
 * tiers et la naissance d'un superfan est un geste humain gouverné — le
 * composant se masque si `auth.me.canOperate` est faux (la query candidates
 * est `operatorProcedure` côté serveur ; la mutation `superfan.register` est
 * `requireOperator`). 0 candidat → rien (pas de bruit).
 *
 * DS : tokens sémantiques uniquement, primitives Button/EmptyState, aucune
 * couleur brute, aucun variant inline (une seule apparence — pas de CVA requis).
 * Vocabulaire client ADR-0123 : « Prescripteur » (jamais le rung interne).
 */

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";

/** Libellés business des rungs (lexique T7 — « Prescripteur », pas le terme interne). */
const SEGMENT_LABELS: Record<string, string> = {
  SPECTATEUR: "Spectateur",
  INTERESSE: "Intéressé",
  PARTICIPANT: "Participant",
  ENGAGE: "Engagé",
  AMBASSADEUR: "Ambassadeur",
  EVANGELISTE: "Prescripteur",
};

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  TWITTER: "X",
  YOUTUBE: "YouTube",
};

export function SuperfanCandidatesPanel({ strategyId }: { strategyId: string }) {
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const canOperate = me.data?.canOperate === true;

  const utils = trpc.useUtils();
  const candidates = trpc.superfan.candidates.useQuery(
    { strategyId },
    { enabled: canOperate && !!strategyId },
  );
  const register = trpc.superfan.register.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.superfan.candidates.invalidate({ strategyId }),
        utils.cockpitDashboard.getCommunityDashboard.invalidate(),
        utils.superfan.count.invalidate({ strategyId }),
      ]);
    },
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  if (!canOperate) return null;
  if (!candidates.data || candidates.data.length === 0) return null;

  const follow = (c: NonNullable<typeof candidates.data>[number]) => {
    const key = `${c.platform}::${c.handle}`;
    setPendingKey(key);
    register.mutate(
      {
        strategyId,
        platform: c.platform,
        handle: c.handle,
        segment: c.proposedSegment,
        engagementDepth: c.proposedDepth,
        interactions: c.interactions,
        lastActiveAt: new Date(c.lastActiveAt),
        source: "SOCIAL",
        displayName: c.displayName,
      },
      { onSettled: () => setPendingKey(null) },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserPlus className="h-4 w-4 text-accent" aria-hidden />
        Fans détectés
      </h2>
      <p className="mb-4 text-xs text-foreground-secondary">
        Personnes qui interagissent régulièrement avec la marque sur les réseaux
        connectés et que vous ne suivez pas encore. Suivre un fan l&apos;ajoute au
        suivi de communauté — c&apos;est vous qui décidez.
      </p>
      <ul className="space-y-2">
        {candidates.data.map((c) => {
          const key = `${c.platform}::${c.handle}`;
          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {c.displayName ?? c.handle}
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {PLATFORM_LABELS[c.platform] ?? c.platform} · {c.interactions}{" "}
                  interaction{c.interactions > 1 ? "s" : ""} · {c.activeDays} jour
                  {c.activeDays > 1 ? "s" : ""} actif{c.activeDays > 1 ? "s" : ""}
                </p>
              </div>
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                {SEGMENT_LABELS[c.proposedSegment] ?? c.proposedSegment}
              </span>
              <Button
                size="sm"
                variant="subtle"
                loading={pendingKey === key && register.isPending}
                disabled={register.isPending}
                onClick={() => follow(c)}
              >
                Suivre ce fan
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
