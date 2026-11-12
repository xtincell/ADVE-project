"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useStrategy } from "@/components/cockpit/strategy-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/shared/notification-toast";

export function BrandPlatformCta({
  nodeId,
  nodeName,
  operatorId,
  clientId,
  strategyId,
  countryCode,
  updatedAt,
}: {
  nodeId: string;
  nodeName: string;
  nodeKind: string;
  operatorId: string;
  clientId: string | null;
  strategyId: string | null;
  countryCode: string | null;
  updatedAt: Date;
}) {
  const router = useRouter();
  const { setStrategyId } = useStrategy();
  const utils = trpc.useUtils();
  const toast = useToast();
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

  const createStrategy = trpc.strategy.create.useMutation();

  const isPending = createStrategy.isPending;

  if (strategyId) {
    return (
      <button
        type="button"
        onClick={() => {
          setStrategyId(strategyId);
          router.push(
            `/cockpit/brand/fondation?strategy=${encodeURIComponent(strategyId)}`,
          );
        }}
        className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
        title={`Plateforme de marque ${nodeName} (Strategy attachée)`}
      >
        <Rocket className="h-4 w-4" />
        Ouvrir la plateforme de marque
      </button>
    );
  }

  const handleCreate = async () => {
    setCreateConfirmOpen(false);
    try {
      const { id: targetId } = await createStrategy.mutateAsync({
        name: nodeName,
        operatorId,
        clientId: clientId ?? undefined,
        country: countryCode ?? undefined,
        portfolioNode: { nodeId, expectedUpdatedAt: updatedAt.toISOString() },
      });
      await utils.brandNode.invalidate();
      await utils.strategy.invalidate();
      setStrategyId(targetId);
      router.push(
        `/cockpit/brand/fondation?strategy=${encodeURIComponent(targetId)}`,
      );
    } catch (err) {
      void utils.brandNode.invalidate();
      toast.error(
        `Création échouée : ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setCreateConfirmOpen(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:border-accent hover:bg-accent/20 disabled:opacity-50"
        title={`Créer la plateforme de marque pour ${nodeName}`}
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? "Création…" : "Créer la plateforme de marque"}
      </button>
      <ConfirmDialog
        open={createConfirmOpen}
        onClose={() => setCreateConfirmOpen(false)}
        onConfirm={() => void handleCreate()}
        variant="info"
        title={`Créer la plateforme de marque pour « ${nodeName} » ?`}
        message="La plateforme sera rattachée à ce dossier. Vous pourrez ensuite éditer les piliers et générer l'Oracle."
        confirmLabel="Créer"
      />
    </>
  );
}
