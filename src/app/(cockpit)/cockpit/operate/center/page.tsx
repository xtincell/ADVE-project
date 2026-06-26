"use client";

import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Hammer } from "lucide-react";
import OperationsCenter from "@/components/cockpit/operations-center";

export default function OperationsCenterPage() {
  const strategyId = useCurrentStrategyId();

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={Hammer}
          title="Sélectionnez une marque"
          description="Cette surface nécessite de sélectionner une stratégie active dans le menu supérieur."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Operations Center"
        description="Le hub opérationnel quotidien du pilote de marque : actions priorisées, charge de l'équipe et consolidation budgétaire."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Opérations" },
          { label: "Operations Center" },
        ]}
      />

      <OperationsCenter strategyId={strategyId} />
    </div>
  );
}
