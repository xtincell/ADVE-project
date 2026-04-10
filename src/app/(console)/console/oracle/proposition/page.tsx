"use client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FileBarChart } from "lucide-react";

export default function OraclePropositionPage() {
  // TODO: Port the cockpit/brand/proposition page here with NETERU enrichment
  // The cockpit version uses enrichOracle (v1). This console version will use enrichOracleNeteru (v2).

  return (
    <div className="space-y-6">
      <PageHeader
        title="L'Oracle — Proposition Strategique"
        description="Le livrable high-ticket propulse par les NETERU. 21 sections, 3 personas, partage + export PDF."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "L'Oracle", href: "/console/oracle/clients" },
          { label: "Proposition" },
        ]}
      />
      <EmptyState
        icon={FileBarChart}
        title="Selectionnez une strategie"
        description="La proposition est generee depuis les piliers ADVE-RTIS enrichis par le trio NETERU (Seshat observe → Mestor decide → Artemis execute)."
      />
    </div>
  );
}
