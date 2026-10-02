/**
 * /cockpit/portfolio — Phase 18 (ADR-0059) Brand Tree.
 *
 * Page racine portfolio : liste les BrandNode racines (parentNodeId = null) de
 * l'opérateur courant, avec drill-down vers chaque sous-arbre via slug.
 *
 * Manual-first parity (ADR-0060) : bouton "+ Ajouter une marque" qui ouvre
 * `<BrandNodeForm />` standalone — création 100% manuelle d'un nœud
 * (CORPORATE pour FrieslandCampina, ou STANDALONE_BRAND pour marque solo).
 */

"use client";

import { usePortfolioOperator } from "@/components/portfolio/use-portfolio-operator";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { BrandNodeForm } from "@/components/portfolio/BrandNodeForm";
import { PortfolioTreeView } from "@/components/portfolio/PortfolioTreeView";
import { Plus, Building, Upload } from "lucide-react";

export default function PortfolioRootPage() {
  const [showForm, setShowForm] = useState(false);
  const { operator, operators, isLoading: operatorLoading, error } = usePortfolioOperator();
  const router = useRouter();

  if (operatorLoading) return <div className="p-6 text-sm text-foreground-secondary">Chargement…</div>;
  if (error) return <p role="alert" className="p-6 text-error">Le portefeuille n’a pas pu être chargé : {error.message}</p>;
  if (!operator) {
    return (
      <div className="p-6">
        <div className="rounded border border-error/30 bg-error/10 p-4 text-sm">
          Aucune équipe associée à votre session. Contactez votre administrateur.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-foreground-secondary">
            <Building className="h-3 w-3" /> Équipe : {operator.name}
          </div>
          <h1 className="font-display text-3xl font-semibold">Portefeuille de marques</h1>
          <p className="text-sm text-foreground-secondary">
            Retrouvez chaque marque, ses produits, ses projets et ses assets. Les dossiers gardent leur contexte, même lorsqu’ils sont suivis dans plusieurs outils.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/launchpad/portfolio-bulk-import"
            className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm hover:bg-card"
          >
            <Upload className="h-4 w-4" /> Import XLSX
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
          >
            <Plus className="h-4 w-4" /> Ajouter une marque
          </button>
        </div>
      </header>

      {operators.length > 1 && <label className="flex items-center gap-3 text-sm">Équipe
        <select aria-label="Équipe du portefeuille" value={operator.id} onChange={(e) => router.push(`/cockpit/portfolio?operator=${encodeURIComponent(e.target.value)}`)} className="rounded-lg border border-border bg-background px-3 py-2">
          {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>}
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
          Marques et groupes
        </h2>
        <PortfolioTreeView operatorId={operator.id} parentNodeId={null} maxDepth={3} />
      </section>
    </div>
  );
}
