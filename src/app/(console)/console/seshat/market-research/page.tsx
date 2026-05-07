"use client";

/**
 * Console — Seshat > Recherche marché (LLM-driven, cross-marques).
 *
 * L'opérateur saisit une question (query) + scoping (pays + secteur) +
 * optionnellement N URLs de sources. Le service Seshat market-research
 * orchestre :
 *   1. Fetch des URLs (anti-SSRF + budget).
 *   2. Construction d'un prompt LLM ancré sur structured-market-study/v1.
 *   3. Appel LLM (purpose: extraction) → markdown structuré.
 *   4. Parse déterministe + persistance KnowledgeEntry country+sector.
 *   5. Le rapport est dispo aux autres marques via les indexes
 *      (sector, countryCode) existants (ADR-0037 PR-I).
 *
 * Cf. ADR-0037 PR-I + ADR-0060 manual-first parity.
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Globe2,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";

interface ResearchOutput {
  rawEntryId?: string;
  sha256?: string;
  countryCode?: string;
  sector?: string;
  entriesCreated?: number;
  markdown?: string;
  warnings?: string[];
  errors?: string[];
  sourcesFetched?: Array<{ url: string; ok: boolean; status: number; bytesRead: number }>;
  memoryOnly?: boolean;
}

export default function MarketResearchPage() {
  const [query, setQuery] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [sector, setSector] = useState("");
  const [sourceUrlsRaw, setSourceUrlsRaw] = useState("");
  const [brandNature, setBrandNature] = useState("PRODUCT");
  const [cascadeLevel, setCascadeLevel] = useState("MASTER_BRAND");
  const [showMarkdown, setShowMarkdown] = useState(false);

  const sourceUrls = useMemo(
    () =>
      sourceUrlsRaw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    [sourceUrlsRaw],
  );

  const runResearch = trpc.marketStudyIngestion.runResearch.useMutation();
  const exportPdf = trpc.marketStudyIngestion.exportResearchPdf.useMutation();

  const result = runResearch.data;
  const output = (result?.output ?? {}) as ResearchOutput;
  const canSubmit =
    query.trim().length >= 8 &&
    /^[A-Z]{2}$/.test(countryCode.trim()) &&
    sector.trim().length > 0 &&
    !runResearch.isPending;

  function handleRun() {
    if (!canSubmit) return;
    runResearch.mutate({
      query: query.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      sector: sector.trim(),
      sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
      brandNature: brandNature || undefined,
      cascadeLevel: cascadeLevel || undefined,
    });
  }

  async function handleExportPdf() {
    if (!output.rawEntryId) return;
    const pdf = await exportPdf.mutateAsync({ rawEntryId: output.rawEntryId });
    const binary = atob(pdf.pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: pdf.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdf.filenameSuggested;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isOk = result?.status === "OK";
  const isFailed = result?.status === "FAILED";
  const isVetoed = result?.status === "VETOED";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Recherche marché"
        description="Lance une recherche marché LLM-ancrée sur des sources URL. Le rapport produit est au format structured-market-study/v1, persisté dans la mémoire système (cross-brand via countryCode × sector), exportable en PDF."
      />

      {/* Form */}
      <div className="space-y-4 rounded-lg border border-white/8 bg-white/[0.02] p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="mr-query">
            Question / brief opérateur
          </label>
          <textarea
            id="mr-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            placeholder="Ex : Quel est le paysage concurrentiel de la skincare premium en Afrique du Sud en 2025 ? Concurrents principaux, segments consommateurs, prix moyens, signaux faibles…"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-rocket-red/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="mr-country">
              Pays (ISO-2)
            </label>
            <input
              id="mr-country"
              type="text"
              maxLength={2}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="ZA"
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="mr-sector">
              Secteur
            </label>
            <input
              id="mr-sector"
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="cosmetics"
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="mr-nature">
              Brand nature
            </label>
            <select
              id="mr-nature"
              value={brandNature}
              onChange={(e) => setBrandNature(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="PRODUCT">PRODUCT</option>
              <option value="SERVICE">SERVICE</option>
              <option value="CHARACTER_IP">CHARACTER_IP</option>
              <option value="FESTIVAL_IP">FESTIVAL_IP</option>
              <option value="MEDIA_IP">MEDIA_IP</option>
              <option value="RETAIL_SPACE">RETAIL_SPACE</option>
              <option value="PLATFORM">PLATFORM</option>
              <option value="INSTITUTION">INSTITUTION</option>
              <option value="PERSONAL">PERSONAL</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="mr-cascade">
              Cascade level
            </label>
            <select
              id="mr-cascade"
              value={cascadeLevel}
              onChange={(e) => setCascadeLevel(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="CORPORATE">CORPORATE</option>
              <option value="MASTER_BRAND">MASTER_BRAND</option>
              <option value="REGIONAL_CLUSTER">REGIONAL_CLUSTER</option>
              <option value="REGIONAL_BRAND">REGIONAL_BRAND</option>
              <option value="PRODUCT_LINE">PRODUCT_LINE</option>
              <option value="PRODUCT_VARIANT">PRODUCT_VARIANT</option>
              <option value="SKU">SKU</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground-muted" htmlFor="mr-urls">
            Sources URL (une par ligne) — optionnel
          </label>
          <textarea
            id="mr-urls"
            value={sourceUrlsRaw}
            onChange={(e) => setSourceUrlsRaw(e.target.value)}
            rows={3}
            placeholder="https://www.statista.com/...&#10;https://www.euromonitor.com/...&#10;https://...&#10;Laisser vide → mode mémoire-modèle (warning UI)"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-rocket-red/30"
          />
          {sourceUrls.length === 0 ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Mode mémoire-modèle — anti-fab forcé, mais chiffres non-sourcés en temps réel.
            </p>
          ) : (
            <p className="mt-1 text-xs text-foreground-muted">{sourceUrls.length} source(s) à fetcher.</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRun}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded bg-rocket-red px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rocket-red/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {runResearch.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche en cours… (≈30-60 s)
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Lancer la recherche
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 ${
              isOk
                ? "border-emerald-500/30 bg-emerald-500/5"
                : isFailed
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            {isOk ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
            ) : isFailed ? (
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            )}
            <div className="flex-1 space-y-1">
              <div className="text-sm font-semibold text-white">
                {isOk ? "Recherche persistée" : isFailed ? "Échec" : isVetoed ? "Veto governance" : result.status}
              </div>
              <div className="text-xs text-foreground-muted">{result.summary}</div>
              {result.reason ? (
                <div className="text-xs text-red-300">Raison : {result.reason}</div>
              ) : null}
            </div>
          </div>

          {output.memoryOnly ? (
            <div className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/[0.04] p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Mode mémoire-modèle activé. Les chiffres dans le rapport proviennent de la mémoire d'entraînement du LLM,
                pas de sources temps-réel. Pour une fiche de marque opérationnelle, fournir des sources et regénérer.
              </span>
            </div>
          ) : null}

          {Array.isArray(output.sourcesFetched) && output.sourcesFetched.length > 0 ? (
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Sources fetchées ({output.sourcesFetched.filter((s) => s.ok).length} OK / {output.sourcesFetched.length})
              </div>
              <ul className="space-y-1 text-xs">
                {output.sourcesFetched.map((s) => (
                  <li key={s.url} className="flex items-center gap-2">
                    {s.ok ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span className="font-mono text-foreground-muted">{s.url}</span>
                    <span className="text-foreground-muted">
                      ({s.ok ? `${(s.bytesRead / 1024).toFixed(1)} KiB` : `HTTP ${s.status || "—"}`})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {Array.isArray(output.warnings) && output.warnings.length > 0 ? (
            <div className="rounded border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              <div className="mb-1 font-semibold">Warnings parser</div>
              <ul className="list-inside list-disc space-y-1">
                {output.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {Array.isArray(output.errors) && output.errors.length > 0 ? (
            <div className="rounded border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
              <div className="mb-1 font-semibold">Erreurs parser</div>
              <ul className="list-inside list-disc space-y-1">
                {output.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {isOk && output.rawEntryId ? (
            <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4">
              <Globe2 className="h-4 w-4 text-foreground-muted" />
              <div className="flex-1 text-xs">
                <span className="text-foreground-muted">
                  {output.entriesCreated ?? "?"} KnowledgeEntry rows créées · {output.countryCode} × {output.sector}
                </span>
                <div className="mt-0.5 font-mono text-[10px] text-foreground-muted">
                  rawEntryId : {output.rawEntryId} · sha256 : {output.sha256?.slice(0, 12)}…
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportPdf.isPending}
                className="inline-flex items-center gap-1.5 rounded bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-40"
              >
                {exportPdf.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => setShowMarkdown((v) => !v)}
                className="rounded bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
              >
                {showMarkdown ? "Masquer" : "Voir"} markdown
              </button>
            </div>
          ) : null}

          {showMarkdown && output.markdown ? (
            <div className="overflow-x-auto rounded-lg border border-white/8 bg-zinc-900/50 p-4">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground-muted">
                {output.markdown}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
