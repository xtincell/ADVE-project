"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_NAMES } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS, ADVE_KEYS } from "@/domain/pillars";
import {
  Upload, FileText, Database, Brain, CheckCircle, AlertTriangle,
  Play, Trash2, Eye, Loader2, Plus, FileSpreadsheet, Image, File,
} from "lucide-react";

const FILE_ICONS: Record<string, React.ElementType> = {
  PDF: FileText, DOCX: FileText, DOC: FileText, TXT: FileText,
  XLSX: FileSpreadsheet, XLS: FileSpreadsheet, CSV: FileSpreadsheet,
  IMG: Image, PNG: Image, JPG: Image, JPEG: Image, WEBP: Image,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-surface-raised text-foreground-secondary",
  EXTRACTING: "bg-blue-500/15 text-blue-400",
  EXTRACTED: "bg-warning/15 text-warning",
  PROCESSING: "bg-accent/15 text-accent",
  PROCESSED: "bg-success/15 text-success",
  FAILED: "bg-error/15 text-error",
};

const VALIDATION_COLORS: Record<string, string> = {
  DRAFT: "bg-surface-raised text-foreground-secondary",
  AI_PROPOSED: "bg-accent/15 text-accent",
  VALIDATED: "bg-success/15 text-success",
  LOCKED: "bg-blue-500/15 text-blue-400",
};

export default function IngestionPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [textInput, setTextInput] = useState("");
  const [textLabel, setTextLabel] = useState("");
  const [showTextModal, setShowTextModal] = useState(false);
  const [reviewPillar, setReviewPillar] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const strategiesQuery = trpc.strategy.list.useQuery({});
  const sourcesQuery = trpc.ingestion.listSources.useQuery(
    { strategyId: selectedStrategy },
    { enabled: !!selectedStrategy },
  );
  const statusQuery = trpc.ingestion.getStatus.useQuery(
    { strategyId: selectedStrategy },
    { enabled: !!selectedStrategy, refetchInterval: processing ? 3000 : false },
  );
  const pillarProposal = trpc.ingestion.getPillarProposal.useQuery(
    { strategyId: selectedStrategy, pillarKey: reviewPillar ?? "" },
    { enabled: !!selectedStrategy && !!reviewPillar },
  );

  const utils = trpc.useUtils();

  const uploadMutation = trpc.ingestion.uploadFile.useMutation({
    onSuccess: () => utils.ingestion.listSources.invalidate(),
  });
  const textMutation = trpc.ingestion.addText.useMutation({
    onSuccess: () => {
      utils.ingestion.listSources.invalidate();
      setShowTextModal(false);
      setTextInput("");
      setTextLabel("");
    },
  });
  const deleteMutation = trpc.ingestion.deleteSource.useMutation({
    onSuccess: () => utils.ingestion.listSources.invalidate(),
  });
  const processMutation = trpc.ingestion.process.useMutation({
    onSuccess: () => {
      setProcessing(false);
      utils.ingestion.getStatus.invalidate();
      utils.ingestion.listSources.invalidate();
    },
    onError: () => setProcessing(false),
  });
  const validateMutation = trpc.ingestion.validatePillar.useMutation({
    onSuccess: () => {
      utils.ingestion.getStatus.invalidate();
      setReviewPillar(null);
    },
  });

  const strategies = strategiesQuery.data ?? [];
  const sources = sourcesQuery.data ?? [];
  const status = statusQuery.data;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedStrategy) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1] ?? "";
        const ext = file.name.split(".").pop()?.toUpperCase() ?? "TXT";
        uploadMutation.mutate({
          strategyId: selectedStrategy,
          fileName: file.name,
          fileType: ext,
          content: base64,
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }, [selectedStrategy, uploadMutation]);

  const handleProcess = () => {
    if (!selectedStrategy) return;
    setProcessing(true);
    processMutation.mutate({ strategyId: selectedStrategy });
  };

  if (strategiesQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingestion IA"
        description="Importez des donnees brutes et laissez l'IA remplir les piliers ADVE"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Oracle" },
          { label: "Ingestion" },
        ]}
      />

      {/* Strategy selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-white outline-none focus:border-accent"
        >
          <option value="">Selectionnez une marque</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {selectedStrategy && (
          <StatusBadge status={status?.phase ?? "IDLE"} />
        )}
      </div>

      {!selectedStrategy ? (
        <EmptyState
          icon={Database}
          title="Selectionnez une marque"
          description="Choisissez une strategie pour commencer l'ingestion de donnees."
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Sources" value={sources.length} icon={Database} />
            <StatCard title="Extraites" value={sources.filter((s) => s.processingStatus === "EXTRACTED" || s.processingStatus === "PROCESSED").length} icon={FileText} />
            <StatCard title="Piliers proposes" value={status?.results.filter((r) => r.confidence > 0).length ?? 0} icon={Brain} />
            <StatCard title="Progres" value={`${Math.round((status?.progress ?? 0) * 100)}%`} icon={CheckCircle} />
          </div>

          {/* Upload zone */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background/50 p-8 transition-colors hover:border-accent">
              <Upload className="mb-3 h-10 w-10 text-foreground-muted" />
              <span className="text-sm font-medium text-foreground-secondary">Uploader des fichiers</span>
              <span className="mt-1 text-[10px] text-foreground-muted">PDF, DOCX, XLSX, Images — Max 10 MB par fichier</span>
              <input type="file" className="hidden" multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt"
                onChange={handleFileUpload} />
            </label>

            <button
              onClick={() => setShowTextModal(true)}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background/50 p-8 transition-colors hover:border-accent"
            >
              <Plus className="mb-3 h-10 w-10 text-foreground-muted" />
              <span className="text-sm font-medium text-foreground-secondary">Coller du texte</span>
              <span className="mt-1 text-[10px] text-foreground-muted">Business plan, notes, brief, description...</span>
            </button>
          </div>

          {/* Sources list */}
          {sources.length > 0 && (
            <div className="rounded-xl border border-border bg-background/80 p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Sources de donnees ({sources.length})</h3>
              <div className="space-y-2">
                {sources.map((src) => {
                  const Icon = FILE_ICONS[src.fileType ?? ""] ?? File;
                  const meta = src.extractedFields as Record<string, unknown> | null;
                  return (
                    <div key={src.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-4 py-3">
                      <Icon className="h-5 w-5 shrink-0 text-foreground-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{src.fileName ?? src.sourceType}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-foreground-muted">{src.fileType}</span>
                          {!!meta?.wordCount && <span className="text-[10px] text-foreground-muted">{String(meta.wordCount)} mots</span>}
                          {!!meta?.pages && <span className="text-[10px] text-foreground-muted">{String(meta.pages)} pages</span>}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[src.processingStatus] ?? STATUS_COLORS.PENDING}`}>
                        {src.processingStatus}
                      </span>
                      {src.errorMessage && (
                        <span className="text-[10px] text-error" title={src.errorMessage}>
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate({ id: src.id })}
                        className="rounded p-1 text-foreground-muted hover:bg-background hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Process button */}
          {sources.length > 0 && (
            <button
              disabled={processing || processMutation.isPending}
              onClick={handleProcess}
              className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {processing ? "Analyse en cours..." : "Lancer l'analyse IA"}
            </button>
          )}

          {/* Pillar validation cards */}
          {status && status.results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Validation des piliers</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {PILLAR_KEYS.map((key) => {
                  const result = status.results.find((r) => r.pillarKey === key);
                  const pillarName = PILLAR_NAMES[key.toLowerCase() as keyof typeof PILLAR_NAMES] ?? key;
                  const isADVE = (ADVE_KEYS as readonly string[]).includes(key);

                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-border bg-background/80 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-xs font-bold text-white">
                            {key}
                          </span>
                          <span className="text-sm font-medium text-white">{pillarName}</span>
                        </div>
                        {result && result.confidence > 0 && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            VALIDATION_COLORS[result.confidence >= 0.8 ? "VALIDATED" : result.confidence > 0 ? "AI_PROPOSED" : "DRAFT"]
                          }`}>
                            {result.confidence >= 0.8 ? "Valide" : result.confidence > 0 ? "IA propose" : "Vide"}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3 h-1.5 rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${result?.completionPercentage ?? 0}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                        <span>{Math.round(result?.completionPercentage ?? 0)}% complet</span>
                        <span>{result?.gloryToolsUsed?.length ?? 0} Glory tools</span>
                      </div>

                      {result && result.validationErrors.length > 0 && (
                        <p className="mt-2 text-[10px] text-warning">
                          {result.validationErrors.length} erreur(s) de validation
                        </p>
                      )}

                      {/* Action buttons */}
                      {isADVE && result && result.confidence > 0 && result.confidence < 0.8 && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setReviewPillar(key)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-secondary hover:bg-background"
                          >
                            <Eye className="h-3 w-3" /> Revoir
                          </button>
                          <button
                            onClick={() => validateMutation.mutate({ strategyId: selectedStrategy, pillarKey: key })}
                            disabled={validateMutation.isPending}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs text-white hover:bg-success disabled:opacity-50"
                          >
                            <CheckCircle className="h-3 w-3" /> Valider
                          </button>
                        </div>
                      )}

                      {result && result.confidence >= 0.8 && (
                        <div className="mt-3 flex items-center gap-1 text-[10px] text-success">
                          <CheckCircle className="h-3 w-3" /> Valide par l&apos;operateur
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RTIS status */}
          {status?.phase === "COMPLETE" && (
            <div className="rounded-xl border border-success/50 bg-success/20 p-6 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-success" />
              <p className="mt-2 text-sm font-medium text-success">
                Pipeline d&apos;ingestion complet
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Les 8 piliers ADVE-RTIS sont remplis. Le scoring et le First Value Protocol ont ete declenches.
              </p>
            </div>
          )}
        </>
      )}

      {/* Text input modal */}
      <Modal open={showTextModal} onClose={() => setShowTextModal(false)} title="Ajouter du texte" size="lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">Label (optionnel)</label>
            <input
              value={textLabel}
              onChange={(e) => setTextLabel(e.target.value)}
              placeholder="Ex: Business plan, Notes reunion, Brief client..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">Contenu</label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={12}
              placeholder="Collez ici le contenu a analyser..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </div>
          <button
            disabled={textInput.trim().length < 10 || textMutation.isPending}
            onClick={() => textMutation.mutate({ strategyId: selectedStrategy, text: textInput, label: textLabel || undefined })}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
          >
            {textMutation.isPending ? "Ajout..." : "Ajouter comme source"}
          </button>
        </div>
      </Modal>

      {/* Pillar review modal */}
      <Modal
        open={!!reviewPillar}
        onClose={() => setReviewPillar(null)}
        title={`Review pilier ${reviewPillar} — ${reviewPillar ? PILLAR_NAMES[reviewPillar.toLowerCase() as keyof typeof PILLAR_NAMES] ?? "" : ""}`}
        size="lg"
      >
        {pillarProposal.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
          </div>
        ) : pillarProposal.data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VALIDATION_COLORS[pillarProposal.data.validationStatus] ?? ""}`}>
                {pillarProposal.data.validationStatus}
              </span>
              <span className="text-xs text-foreground-muted">
                Confiance: {((pillarProposal.data.confidence ?? 0) * 100).toFixed(0)}%
              </span>
            </div>

            {/* Content fields */}
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-border bg-background/50 p-4">
              {Object.entries((pillarProposal.data.content as Record<string, unknown>) ?? {}).map(([field, value]) => (
                <div key={field} className="rounded-lg bg-background/50 p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase text-foreground-muted">{field}</p>
                  <pre className="whitespace-pre-wrap text-xs text-foreground-secondary">
                    {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>

            {/* Sources */}
            {pillarProposal.data.sources && (
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="mb-2 text-[10px] font-medium uppercase text-foreground-muted">Sources</p>
                <div className="space-y-1">
                  {(pillarProposal.data.sources as Array<{ sourceType: string; field: string; excerpt: string }>).map((src, i) => (
                    <p key={i} className="text-[10px] text-foreground-muted">
                      <span className="text-foreground-secondary">{src.sourceType}</span> → {src.field}: {src.excerpt?.slice(0, 60)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Glory outputs */}
            {pillarProposal.data.gloryOutputs.length > 0 && (
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="mb-2 text-[10px] font-medium uppercase text-foreground-muted">
                  Glory Tools utilises ({pillarProposal.data.gloryOutputs.length})
                </p>
                {pillarProposal.data.gloryOutputs.map((g) => (
                  <div key={g.id} className="text-[10px] text-foreground-secondary">
                    {g.toolSlug} — {new Date(g.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setReviewPillar(null)}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
              >
                Fermer
              </button>
              <button
                disabled={validateMutation.isPending}
                onClick={() => validateMutation.mutate({ strategyId: selectedStrategy, pillarKey: reviewPillar! })}
                className="flex-1 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-white hover:bg-success disabled:opacity-50"
              >
                {validateMutation.isPending ? "Validation..." : "Valider ce pilier"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">Aucune proposition pour ce pilier.</p>
        )}
      </Modal>
    </div>
  );
}
