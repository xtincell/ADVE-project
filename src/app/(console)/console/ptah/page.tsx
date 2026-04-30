"use client";

/**
 * Console /console/ptah — Mission Control kiln tracker (UPgraders).
 *
 * Vue cross-strategy de toutes les forges Ptah en cours et récentes.
 * Provider health + métriques agrégées.
 */

import { PageHeader } from "@/components/shared/page-header";
import { PtahKilnTracker } from "@/components/neteru";

export default function PtahKilnPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ptah · Fonderie (Kiln)"
        description="Vue cross-strategy de toutes les forges actives et récentes. Provider health, ROI agrégé par mode."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Ptah" }]}
      />
      <PtahKilnTracker />
    </div>
  );
}
