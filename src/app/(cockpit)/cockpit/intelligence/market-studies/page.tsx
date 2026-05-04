"use client";

/**
 * Cockpit — Intelligence > Études de marché
 *
 * Page d'ingestion d'études tierces (Statista, Nielsen, Kantar, BCG…).
 * Cf. ADR-0037 PR-J. Workflow : upload → preview → confirm → KE country+sector.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { MarketStudyExtraction } from "@/server/services/seshat/market-study-ingestion/types";

interface PreviewSuccess {
  ok: true;
  sha256: string;
  text: string;
  extraction: MarketStudyExtraction;
  resolvedCountryCode?: string;
  resolvedSector?: string;
  alreadyIngested: boolean;
}
interface PreviewFailure {
  ok: false;
  sha256: string;
  error: string;
}
type PreviewState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "preview"; data: PreviewSuccess }
  | { status: "confirming" }
  | { status: "confirmed" }
  | { status: "error"; message: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function MarketStudiesPage() {
  const strategyId = useCurrentStrategyId();
  const list = trpc.marketStudyIngestion.list.useQuery({ strategyId: strategyId ?? undefined, limit: 50 });
  const previewMut = trpc.marketStudyIngestion.preview.useMutation();
  const confirmMut = trpc.marketStudyIngestion.confirm.useMutation();
  const [openUpload, setOpenUpload] = useState(false);
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const [declaredCountry, setDeclaredCountry] = useState("");
  const [declaredSector, setDeclaredSector] = useState("");

  async function handleUpload(file: File) {
    setState({ status: "uploading" });
    try {
      const base64 = await fileToBase64(file);
      const data = (await previewMut.mutateAsync({
        file: { filename: file.name, mimeType: file.type, base64 },
        strategyId: strategyId ?? undefined,
        declaredCountryCode: declaredCountry.trim() ? declaredCountry.trim().toUpperCase().slice(0, 2) : undefined,
        declaredSector: declaredSector.trim() || undefined,
      })) as PreviewSuccess | PreviewFailure;
      if (!data.ok) {
        setState({ status: "error", message: data.error });
      } else {
        setState({ status: "preview", data });
      }
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleConfirm() {
    if (state.status !== "preview") return;
    const cc = state.data.resolvedCountryCode ?? declaredCountry.trim().toUpperCase().slice(0, 2);
    const sector = state.data.resolvedSector ?? declaredSector.trim();
    if (!cc || !sector) {
      setState({ status: "error", message: "Pays et secteur requis avant confirmation." });
      return;
    }
    setState({ status: "confirming" });
    try {
      await confirmMut.mutateAsync({
        sha256: state.data.sha256,
        countryCode: cc,
        sector,
        extraction: state.data.extraction,
        strategyId: strategyId ?? undefined,
      });
      setState({ status: "confirmed" });
      list.refetch();
      setTimeout(() => {
        setOpenUpload(false);
        setState({ status: "idle" });
      }, 1500);
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Études de marché"
        description="Injecte une étude (PDF / DOCX / XLSX) — Statista, Nielsen, Kantar, BCG, Euromonitor — et le moteur Tarsis l'absorbe en KnowledgeEntry country + sector exploitables par le pilier T."
      >
        <button
          type="button"
          onClick={() => setOpenUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-rocket-red px-4 py-2 text-sm font-semibold text-white hover:bg-rocket-red/90"
        >
          <Upload className="h-4 w-4" /> Injecter une étude
        </button>
      </PageHeader>

      {list.isLoading ? (
        <div className="text-foreground-muted">Chargement…</div>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune étude ingérée"
          description="Drag-drop une étude tierce. Le moteur extrait TAM/SAM/SOM, parts de marché concurrentes, segments consommateurs, signaux faibles et 49 variables Trend Tracker."
        />
      ) : (
        <div className="grid gap-3">
          {list.data.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between rounded-lg border border-white/8 bg-white/[0.02] p-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-rocket-red" />
                  <h3 className="text-base font-semibold text-white">{entry.studyTitle}</h3>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">
                  {entry.publisher ? `${entry.publisher} · ` : ""}
                  {entry.countryCode ?? "?"} · {entry.sector ?? "?"} ·{" "}
                  {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                INGÉRÉE
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal open={openUpload} onClose={() => { setOpenUpload(false); setState({ status: "idle" }); }} title="Injecter une étude de marché">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className="text-foreground-muted">Code pays (ISO-2)</span>
              <input
                type="text"
                maxLength={2}
                value={declaredCountry}
                onChange={(e) => setDeclaredCountry(e.target.value.toUpperCase())}
                placeholder="ZA"
                className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs">
              <span className="text-foreground-muted">Secteur</span>
              <input
                type="text"
                value={declaredSector}
                onChange={(e) => setDeclaredSector(e.target.value)}
                placeholder="cosmetics"
                className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          {state.status === "idle" && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/15 bg-white/[0.02] p-8 hover:bg-white/[0.04]">
              <Upload className="h-6 w-6 text-foreground-muted" />
              <span className="mt-2 text-sm text-foreground-muted">Drag-drop ou clique (PDF / DOCX / XLSX, max 50 MB)</span>
              <input
                type="file"
                accept=".pdf,.docx,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </label>
          )}

          {state.status === "uploading" && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Extraction LLM en cours (15-60s)…
            </div>
          )}

          {state.status === "preview" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                <strong className="text-white">{state.data.extraction.study.title}</strong>
                {state.data.extraction.study.publisher ? <span className="text-foreground-muted"> — {state.data.extraction.study.publisher}</span> : null}
                <div className="mt-2 grid grid-cols-2 gap-2 text-foreground-muted">
                  <div>Pays résolu : <span className="text-white">{state.data.resolvedCountryCode ?? "(non détecté)"}</span></div>
                  <div>Secteur résolu : <span className="text-white">{state.data.resolvedSector ?? "(non détecté)"}</span></div>
                  <div>TAM : <span className="text-white">{state.data.extraction.tam ? `${state.data.extraction.tam.value} ${state.data.extraction.tam.currency ?? ""}` : "—"}</span></div>
                  <div>Concurrents : <span className="text-white">{state.data.extraction.competitorShares.length}</span></div>
                  <div>Segments : <span className="text-white">{state.data.extraction.consumerSegments.length}</span></div>
                  <div>Signaux faibles : <span className="text-white">{state.data.extraction.weakSignals.length}</span></div>
                  <div>Trend Tracker : <span className="text-white">{state.data.extraction.trendTracker ? `${Object.keys(state.data.extraction.trendTracker).length}/49` : "0/49"}</span></div>
                </div>
                {state.data.alreadyIngested ? (
                  <p className="mt-2 text-amber-400">Cette étude a déjà été ingérée (sha256 match). Re-confirm créera un doublon.</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!state.data.resolvedCountryCode || !state.data.resolvedSector}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500/90 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" /> Confirmer ingestion
              </button>
            </div>
          )}

          {state.status === "confirming" && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Persistence en cours…
            </div>
          )}

          {state.status === "confirmed" && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" /> Étude ingérée. Le pilier T des brands de ce pays / secteur va l'absorber au prochain enrich.
            </div>
          )}

          {state.status === "error" && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <strong>Erreur :</strong> {state.message}
                <button type="button" onClick={() => setState({ status: "idle" })} className="ml-2 underline">Réessayer</button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
