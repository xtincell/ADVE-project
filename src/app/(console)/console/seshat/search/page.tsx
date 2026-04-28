"use client";

/**
 * Console — Seshat Semantic Search
 *
 * Operator-facing global search across the brand context store.
 * Uses the Seshat ranker (Ollama → OpenAI → no-op chain).
 * Filterable by sector / country / business model.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Search } from "lucide-react";

export default function SeshatSearchPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [businessModel, setBusinessModel] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const { data, isFetching } = trpc.seshatSearch.searchAcrossStrategies.useQuery(
    {
      query: submittedQuery ?? "",
      ...(sector ? { sector } : {}),
      ...(country ? { country } : {}),
      ...(businessModel ? { businessModel } : {}),
      topK: 25,
    },
    {
      enabled: !!submittedQuery && submittedQuery.length >= 2,
      staleTime: 30_000,
    },
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) setSubmittedQuery(query.trim());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recherche sémantique Seshat"
        description="Cherche dans le contexte marque indexé par Seshat — narratifs, recos, valeurs piliers."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Seshat", href: "/console/seshat" },
          { label: "Recherche" },
        ]}
      />

      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: 'culte FMCG cameroun', 'pricing strategy luxe'..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={query.trim().length < 2}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            Chercher
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Filtre secteur (FMCG, BANQUE...)"
            className="px-3 py-2 rounded-lg bg-background border border-border text-xs"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Filtre pays (CM, CI, FR...)"
            className="px-3 py-2 rounded-lg bg-background border border-border text-xs"
          />
          <input
            type="text"
            value={businessModel}
            onChange={(e) => setBusinessModel(e.target.value)}
            placeholder="Filtre modèle (B2C, B2B...)"
            className="px-3 py-2 rounded-lg bg-background border border-border text-xs"
          />
        </div>
      </form>

      {isFetching && (
        <div className="text-sm text-foreground-muted">Recherche en cours…</div>
      )}

      {data && data.count === 0 && !isFetching && (
        <EmptyState
          icon={Search}
          title="Aucun résultat"
          description="Vérifie tes filtres ou élargis la requête. Si le store de contexte est vide, l'indexation s'active automatiquement à chaque intake/boot."
        />
      )}

      {data && data.results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-foreground-muted">
            {data.count} résultats triés par similarité sémantique
          </div>
          <div className="space-y-2">
            {data.results.map((r) => {
              const payload = (r.payload ?? {}) as Record<string, unknown>;
              const text =
                (typeof payload.full === "string" && payload.full) ||
                (typeof payload.justification === "string" && payload.justification) ||
                (typeof payload.value === "string" && payload.value) ||
                (typeof payload.text === "string" && payload.text) ||
                JSON.stringify(payload).slice(0, 400);
              return (
                <div
                  key={r.id}
                  className="rounded-lg border border-border bg-card p-3 hover:bg-card-hover"
                >
                  <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
                    <span>
                      <span className="font-mono">{r.kind}</span>
                      {r.pillarKey ? ` · pilier ${r.pillarKey.toUpperCase()}` : ""}
                      {r.field ? ` · ${r.field}` : ""}
                      {" · "}
                      <a href={`/console/socle/strategies/${r.strategyId}`} className="underline hover:no-underline">
                        {r.strategyId.slice(0, 12)}…
                      </a>
                    </span>
                    <span className="font-mono">sim {r.similarity.toFixed(3)}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
