"use client";

/**
 * <ReferralCodeCard /> — « Mon code de parrainage » (ADR-0157, carte différée
 * livrée avec le passeport fan ADR-0158). Visible founder : le code LF-XXXXXX
 * du compte, à dicter ou partager. Le filleul obtient −20 % sur son premier
 * cycle, le parrain 1 mois offert à la conversion — appliqués par votre
 * équipe, jamais automatiques.
 *
 * DS : tokens sémantiques uniquement, primitives Button.
 */

import { Gift } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/shared/notification-toast";

export function ReferralCodeCard() {
  const code = trpc.referral.getMyCode.useQuery(undefined, { staleTime: 300_000 });
  const toast = useToast();

  if (!code.data?.code) return null;

  const shareText = encodeURIComponent(
    `Fais le diagnostic gratuit de ta marque — indique mon code ${code.data.code} pour -20 % : ${window.location.origin}/intake?parrain=${code.data.code}`,
  );

  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gift className="h-4 w-4 text-accent" aria-hidden />
        Mon code de parrainage
      </h2>
      <p className="mb-3 text-xs text-foreground-secondary">
        Recommandez le diagnostic à un autre dirigeant : il obtient −20 % sur son
        premier cycle, vous gagnez un mois offert quand il devient client.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg border border-border px-3 py-1.5 font-mono text-base tracking-widest text-accent">
          {code.data.code}
        </span>
        <Button
          size="sm"
          variant="subtle"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code.data.code);
              toast.success("Code copié.");
            } catch {
              toast.info(code.data.code);
            }
          }}
        >
          Copier
        </Button>
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-accent underline underline-offset-2"
        >
          Partager sur WhatsApp
        </a>
      </div>
    </div>
  );
}
