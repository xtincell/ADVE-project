/**
 * /cockpit/portfolio — Phase 18 (ADR-0059) Brand Tree.
 *
 * Page racine portfolio : liste les BrandNode racines (parentNodeId = null) de
 * l'opérateur courant, avec drill-down vers chaque sous-arbre via slug.
 *
 * Manual-first parity (ADR-0060) : bouton "+ Nouvelle racine" qui ouvre
 * `<BrandNodeForm />` standalone — création 100% manuelle d'un nœud
 * (CORPORATE pour FrieslandCampina, ou STANDALONE_BRAND pour marque solo).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { BrandNodeForm } from "@/components/portfolio/BrandNodeForm";
import { PortfolioTreeView } from "@/components/portfolio/PortfolioTreeView";
import { Plus, Building, Upload } from "lucide-react";

export default function PortfolioRootPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: operator, isLoading: operatorLoading } = trpc.operator.getOwn.useQuery();

  if (operatorLoading) return <div className="p-6 text-sm text-foreground-secondary">Loading…</div>;
  if (!operator) {
    return (
      <div className="p-6">
        <div className="rounded border border-error/30 bg-error/10 p-4 text-sm">
          Aucun Operator associé à votre session. Contactez l'admin.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-foreground-secondary">
            <Building className="h-3 w-3" /> Operator : {operator.name}
          </div>
          <h1 className="text-2xl font-semibold">Portfolio Brand Tree</h1>
          <p className="text-sm text-foreground-secondary">
            Arbre des marques que tu opères. CORPORATE → MASTER_BRAND → REGIONAL_CLUSTER → REGIONAL_BRAND → PRODUCT_LINE → PRODUCT_VARIANT → SKU.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/launchpad/portfolio-bulk-import"
            className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-card"
          >
            <Upload className="h-4 w-4" /> Import XLSX
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
          >
            <Plus className="h-4 w-4" /> Nouvelle racine
          </button>
        </div>
      </header>

      {showForm && (
        <div className="rounded border border-border bg-surface-raised/50">
          <BrandNodeForm
            operatorId={operator.id}
            parentNodeId={null}
            strategyId={`audit:${operator.id}`}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-secondary">
          Nœuds racines
        </h2>
        <PortfolioTreeView operatorId={operator.id} parentNodeId={null} maxDepth={3} />
      </section>
    </div>
  );
}
