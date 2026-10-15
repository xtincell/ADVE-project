"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PillarPage, PILLAR_CONFIG } from "@/components/cockpit/pillar-page";
import { useStrategy } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs } from "@/components/shared/tabs";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { FriendlyError } from "@/components/shared/friendly-error";
import { Shield } from "lucide-react";

// Compatibility entry point, not a second editor. Both entry points use the
// same field registry, pinned version, documentary receipts and amendment.
export default function PillarEditorPage() {
  return <Suspense fallback={<SkeletonPage />}><PillarEditorSession /></Suspense>;
}

function PillarEditorSession() {
  const { strategyId, isLoading, isError } = useStrategy();
  const params = useSearchParams();
  const focusPaths = [...new Set((params.get("focus") ?? "").split(",").filter(Boolean))];
  const firstKey = focusPaths[0]?.split(".")[0]?.toLowerCase();
  const [pageKey, setPageKey] = useState(
    Object.entries(PILLAR_CONFIG).find(([, config]) => config.pillarKey === firstKey)?.[0] ?? "identity",
  );
  useEffect(() => {
    setPageKey(Object.entries(PILLAR_CONFIG).find(([, config]) => config.pillarKey === firstKey)?.[0] ?? "identity");
  }, [firstKey]);
  const targetId = params.get("strategy") || params.get("strategyId");

  if (isError) return <FriendlyError error={{ message: "Impossible de charger la marque demandée. Sélectionnez une marque accessible." }} />;
  if (isLoading) return <SkeletonPage />;
  // Never mount a draft on the previous brand while the context selects the
  // explicit deep link. StrategyProvider also rejects inaccessible targets.
  if (targetId && strategyId !== targetId) return <SkeletonPage />;
  if (!strategyId) return <EmptyState icon={Shield} title="Aucune marque sélectionnée" description="Sélectionnez une marque dans le cockpit pour réviser sa fiche." />;

  const returnParams = new URLSearchParams({ strategy: strategyId });
  const sequence = params.get("seq");
  if (sequence) returnParams.set("seq", sequence);

  return (
    <div className="space-y-4">
      <PageHeader title={focusPaths.length ? "Compléter la fiche de marque" : "Réviser la fiche de marque"}
        description="Les mêmes données et les mêmes protections que dans vos pages de marque."
        breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Marque", href: "/cockpit/brand/fondation" }, { label: "Révision" }]} />
      {params.get("from") === "glory" ? (
        <Link href={`/console/artemis/tools?${returnParams}`} className="text-sm text-foreground-secondary hover:text-foreground">
          Retour aux outils{sequence ? ` — ${sequence}` : ""}
        </Link>
      ) : null}
      <div className="overflow-x-auto">
        <Tabs activeTab={pageKey} onChange={setPageKey} tabs={Object.entries(PILLAR_CONFIG).map(([key, config]) => ({
          key, label: `${config.pillarKey.toUpperCase()} — ${config.title}`,
          count: focusPaths.filter(path => path.split(".")[0]?.toLowerCase() === config.pillarKey).length || undefined,
        }))} />
      </div>
      <PillarPage key={`${strategyId}:${pageKey}`} pageKey={pageKey} focusPaths={focusPaths} />
    </div>
  );
}
