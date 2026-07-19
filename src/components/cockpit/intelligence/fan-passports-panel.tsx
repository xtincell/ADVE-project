"use client";

/**
 * <FanPassportsPanel /> — délivrance des passeports fan (ADR-0158).
 *
 * Surface OPÉRATEUR uniquement (même posture que les fans détectés) : la
 * délivrance est un geste humain gouverné (`superfan.issuePassport`,
 * requireOperator). Le lien du passeport est copié puis envoyé au fan PAR LA
 * MARQUE (WhatsApp, DM) — pull-first : rien n'est broadcasté d'ici.
 *
 * DS : tokens sémantiques uniquement, primitives Button, aucune couleur brute.
 * Vocabulaire client ADR-0123 : « passeport fan », jamais la plomberie interne.
 */

import { useState } from "react";
import { Ticket } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/shared/notification-toast";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  TWITTER: "X",
  YOUTUBE: "YouTube",
};

export function FanPassportsPanel({ strategyId }: { strategyId: string }) {
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const canOperate = me.data?.canOperate === true;
  const toast = useToast();

  const utils = trpc.useUtils();
  const passports = trpc.superfan.passports.useQuery(
    { strategyId },
    { enabled: canOperate && !!strategyId },
  );
  const issue = trpc.superfan.issuePassport.useMutation({
    onSuccess: async (issued) => {
      await utils.superfan.passports.invalidate({ strategyId });
      const url = `${window.location.origin}${issued.url}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Passeport délivré — lien copié, envoyez-le au fan.");
      } catch {
        toast.success(`Passeport délivré : ${url}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!canOperate) return null;
  if (!passports.data || passports.data.length === 0) return null;

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/passeport/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien du passeport copié.");
    } catch {
      toast.info(url);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Ticket className="h-4 w-4 text-accent" aria-hidden />
        Passeports fan
      </h2>
      <p className="mb-4 text-xs text-foreground-secondary">
        Chaque fan suivi peut recevoir son passeport : une page personnelle où il voit
        son statut, son code de parrainage et les missions ouvertes. Délivrez, copiez
        le lien, envoyez-le au fan (WhatsApp, message privé).
      </p>
      <ul className="space-y-2">
        {passports.data.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {p.displayName ?? p.handle}
              </p>
              <p className="mt-0.5 text-xs text-foreground-muted">
                {PLATFORM_LABELS[p.platform] ?? p.platform}
                {p.issued && p.fanCode ? ` · code ${p.fanCode}` : ""}
              </p>
            </div>
            {p.issued && p.passportToken ? (
              <Button size="sm" variant="subtle" onClick={() => copyLink(p.passportToken!)}>
                Copier le lien
              </Button>
            ) : (
              <Button
                size="sm"
                variant="subtle"
                loading={pendingId === p.id && issue.isPending}
                disabled={issue.isPending}
                onClick={() => {
                  setPendingId(p.id);
                  issue.mutate({ profileId: p.id }, { onSettled: () => setPendingId(null) });
                }}
              >
                Délivrer le passeport
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
