"use client";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives";

export function CalendarPublicationSelection({ strategyId, briefId, briefVersion, materialId }: {
  strategyId: string; briefId: string; briefVersion: number; materialId: string;
}) {
  const router = useRouter(), utils = trpc.useUtils();
  const packages = trpc.social.listPublicationPackages.useQuery({ strategyId });
  const selected = packages.data?.find(p => p.materialId === materialId && p.briefId === briefId);
  function open(id: string) {
    const query = new URLSearchParams({ strategy: strategyId, package: id });
    const operator = new URLSearchParams(window.location.search).get("operator");
    if (operator) query.set("operator", operator);
    router.push(`/cockpit/operate/publish?${query.toString()}`);
  }
  const select = trpc.social.preparePublicationPackage.useMutation({ onSuccess: result => {
    void utils.social.listPublicationPackages.invalidate({ strategyId }); open(result.packageId);
  } });
  return <div className="space-y-2">
    <p className="text-xs text-foreground-secondary">Retenir ce rendu prépare sa légende et sa version exacte pour une relecture distincte.</p>
    <Button size="sm" disabled={select.isPending} onClick={() => selected ? open(selected.id) : select.mutate({
      operation: "SELECT", strategyId, briefId, briefVersion, assetVersionId: materialId,
    })}>{select.isPending ? "Préparation…" : selected ? `Ouvrir le paquet v${selected.version}` : "Retenir ce rendu"}</Button>
    {select.error && <p role="alert" className="text-sm text-status-error">{select.error.message}</p>}
  </div>;
}
