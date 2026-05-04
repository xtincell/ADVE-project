"use client";

/**
 * Console — Seshat > Études de marché (admin all-strategies)
 *
 * Vue admin de toutes les MarketStudy ingérées, filtres pays/secteur,
 * bouton Re-extract si schema d'extraction a évolué.
 * Cf. ADR-0037 PR-J.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { FileText, RefreshCw, Globe2 } from "lucide-react";

export default function ConsoleMarketStudiesPage() {
  const [filterCountry, setFilterCountry] = useState("");
  const [filterSector, setFilterSector] = useState("");

  const list = trpc.marketStudyIngestion.list.useQuery({
    countryCode: filterCountry.trim() ? filterCountry.trim().toUpperCase().slice(0, 2) : undefined,
    sector: filterSector.trim() || undefined,
    limit: 200,
  });
  const reExtract = trpc.marketStudyIngestion.reExtract.useMutation({
    onSuccess: () => list.refetch(),
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Études de marché — admin"
        description="Vue cross-strategies de toutes les MarketStudy ingérées. Bouton Re-extract pour re-extraire avec un schéma mis à jour (preserve la matière brute via MARKET_STUDY_RAW)."
      />

      <div className="flex gap-3">
        <input
          type="text"
          maxLength={2}
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value.toUpperCase())}
          placeholder="Pays (ZA, CM, NG…)"
          className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
        <input
          type="text"
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          placeholder="Secteur (cosmetics, fintech…)"
          className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
      </div>

      {list.isLoading ? (
        <div className="text-foreground-muted">Chargement…</div>
      ) : !list.data || list.data.length === 0 ? (
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-8 text-center text-foreground-muted">
          <FileText className="mx-auto h-8 w-8" />
          <p className="mt-2">Aucune étude ingérée correspondant aux filtres.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/8">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs text-foreground-muted">
              <tr>
                <th className="px-3 py-2 text-left">Étude</th>
                <th className="px-3 py-2 text-left">Pays</th>
                <th className="px-3 py-2 text-left">Secteur</th>
                <th className="px-3 py-2 text-left">Publisher</th>
                <th className="px-3 py-2 text-left">Uploadé par</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white">{e.studyTitle}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-xs"><Globe2 className="h-3 w-3" />{e.countryCode ?? "?"}</span></td>
                  <td className="px-3 py-2 text-foreground-muted">{e.sector ?? "?"}</td>
                  <td className="px-3 py-2 text-foreground-muted">{e.publisher ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-foreground-muted">{e.uploadedBy ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-foreground-muted">{new Date(e.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => reExtract.mutate({ rawEntryId: e.id })}
                      disabled={reExtract.isPending}
                      className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${reExtract.isPending ? "animate-spin" : ""}`} />
                      Re-extract
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
