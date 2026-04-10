"use client";

/**
 * Unified Intake Page — 3 tabs:
 *   1. Quick Intake — list + convert
 *   2. Brief Ingest — upload brief PDF
 *   3. Sources — upload files/text to enrich existing strategy
 */

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  ClipboardList, CheckCircle, Clock, ArrowRightCircle, Upload,
  FileUp, FileText, Brain, Loader2, Plus, X, Trash2, Play, Eye,
  AlertTriangle, Database,
} from "lucide-react";

type Tab = "quick-intake" | "brief-ingest" | "sources";

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: "quick-intake", label: "Quick Intake", icon: ClipboardList },
  { key: "brief-ingest", label: "Brief Ingest", icon: FileUp },
  { key: "sources", label: "Sources", icon: Database },
];

export default function IntakePage() {
  const [activeTab, setActiveTab] = useState<Tab>("quick-intake");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intake"
        description="Onboardez une marque via questionnaire, brief ou import de documents"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Oracle" },
          { label: "Intake" },
        ]}
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-violet-600 text-white"
                : "text-foreground-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "quick-intake" && <QuickIntakeTab />}
      {activeTab === "brief-ingest" && <BriefIngestTab />}
      {activeTab === "sources" && <SourcesTab />}
    </div>
  );
}

// ── Tab 1: Quick Intake ──────────────────────────────────────────────────────

function QuickIntakeTab() {
  const { data: rawData, isLoading } = trpc.quickIntake.listAll.useQuery({ limit: 100 });
  const utils = trpc.useUtils();
  const convertMutation = trpc.quickIntake.convert.useMutation({
    onSuccess: () => {
      utils.quickIntake.listAll.invalidate();
      utils.strategy.list.invalidate();
    },
  });

  if (isLoading) return <SkeletonPage />;

  const intakes = (Array.isArray(rawData) ? rawData : (rawData as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []) as Array<Record<string, unknown>>;
  const completed = intakes.filter(i => i.status === "COMPLETED" && !i.convertedToId);
  const converted = intakes.filter(i => i.status === "CONVERTED" || i.convertedToId);
  const inProgress = intakes.filter(i => i.status === "IN_PROGRESS");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard title="Total" value={intakes.length} icon={ClipboardList} />
        <StatCard title="En cours" value={inProgress.length} icon={Clock} />
        <StatCard title="A convertir" value={completed.length} icon={CheckCircle} />
        <StatCard title="Convertis" value={converted.length} icon={ArrowRightCircle} />
      </div>

      {/* Convertible intakes */}
      {completed.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-300">Prets a convertir en Brand Instance</h3>
          <div className="space-y-2">
            {completed.map(intake => (
              <div key={String(intake.id)} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-card px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{String(intake.companyName || intake.contactEmail || "Sans nom")}</p>
                  <p className="text-[10px] text-foreground-muted">{String(intake.sector ?? "—")} — {String(intake.country ?? "—")}</p>
                </div>
                <button
                  onClick={() => convertMutation.mutate({ intakeId: String(intake.id), userId: "" })}
                  disabled={convertMutation.isPending}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {convertMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightCircle className="h-3.5 w-3.5" />}
                  Convertir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All intakes table */}
      {intakes.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun intake" description="Les intakes apparaissent ici quand un prospect remplit le formulaire." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-foreground-muted">
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Secteur</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {intakes.map(intake => (
                  <tr key={String(intake.id)} className="border-b border-border-subtle/50 hover:bg-card-hover">
                    <td className="px-4 py-3 font-medium text-foreground">{String(intake.companyName || "—")}</td>
                    <td className="px-4 py-3 text-foreground-muted">{String(intake.contactEmail || "—")}</td>
                    <td className="px-4 py-3 text-foreground-muted">{String(intake.sector || "—")}</td>
                    <td className="px-4 py-3"><StatusBadge status={String(intake.status)} /></td>
                    <td className="px-4 py-3 text-foreground-muted">{intake.createdAt ? new Date(String(intake.createdAt)).toLocaleDateString("fr") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Brief Ingest ──────────────────────────────────────────────────────

function BriefIngestTab() {
  const [file, setFile] = useState<{ file: File; name: string } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const previewMutation = trpc.briefIngest.preview.useMutation({
    onError: (err) => setError(err.message),
  });

  const handleFile = useCallback((f: File) => {
    setError("");
    if (f.size > 10 * 1024 * 1024) { setError("Max 10 MB"); return; }
    setFile({ file: f, name: f.name });
  }, []);

  const handleAnalyze = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = (ev.target?.result as string).split(",")[1] ?? "";
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "PDF";
      previewMutation.mutate({ fileName: file.name, fileType: ext as "PDF" | "DOCX" | "TXT", content: b64 });
    };
    reader.readAsDataURL(file.file);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Upload zone */}
      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle bg-card p-10 transition-colors hover:border-violet-500"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <Upload className="mb-3 h-10 w-10 text-foreground-muted" />
        <span className="text-sm font-medium text-foreground">Glissez un brief client ici</span>
        <span className="mt-1 text-xs text-foreground-muted">PDF, DOCX, TXT — Max 10 MB</span>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </label>

      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-card px-4 py-3">
          <FileText className="h-5 w-5 text-violet-400" />
          <span className="flex-1 text-sm text-foreground">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-foreground-muted hover:text-red-400"><X className="h-4 w-4" /></button>
        </div>
      )}

      {file && (
        <button onClick={handleAnalyze} disabled={previewMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
          {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Analyser le brief
        </button>
      )}

      {previewMutation.isSuccess && previewMutation.data.parsed && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-300">Brief analyse</h3>
          <p className="text-xs text-foreground-muted">
            Marque : {(previewMutation.data.parsed as Record<string, unknown> & { client: { brandName: string } }).client.brandName} —
            Confiance : {Math.round((previewMutation.data.confidence ?? 0) * 100)}%
          </p>
          <p className="mt-2 text-xs text-foreground-muted">
            Allez sur la page <a href="/console/oracle/brief-ingest" className="text-violet-400 hover:text-violet-300">Brief Ingest</a> pour le flow complet (preview → confirm → execution NETERU).
          </p>
        </div>
      )}

      {/* Link to full brief ingest */}
      <div className="text-center">
        <a href="/console/oracle/brief-ingest" className="text-xs text-violet-400 hover:text-violet-300">
          Flow complet Brief Ingest →
        </a>
      </div>
    </div>
  );
}

// ── Tab 3: Sources (ex-Ingestion IA) ─────────────────────────────────────────

function SourcesTab() {
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: strategies } = trpc.strategy.list.useQuery({});
  const sourcesQuery = trpc.ingestion.listSources.useQuery(
    { strategyId: selectedStrategy },
    { enabled: !!selectedStrategy },
  );
  const statusQuery = trpc.ingestion.getStatus.useQuery(
    { strategyId: selectedStrategy },
    { enabled: !!selectedStrategy, refetchInterval: processing ? 3000 : false },
  );

  const utils = trpc.useUtils();
  const uploadMutation = trpc.ingestion.uploadFile.useMutation({
    onSuccess: () => utils.ingestion.listSources.invalidate(),
  });
  const textMutation = trpc.ingestion.addText.useMutation({
    onSuccess: () => utils.ingestion.listSources.invalidate(),
  });
  const deleteMutation = trpc.ingestion.deleteSource.useMutation({
    onSuccess: () => utils.ingestion.listSources.invalidate(),
  });
  const processMutation = trpc.ingestion.process.useMutation({
    onSuccess: () => { setProcessing(false); utils.ingestion.getStatus.invalidate(); },
    onError: () => setProcessing(false),
  });

  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textLabel, setTextLabel] = useState("");

  const sources = sourcesQuery.data ?? [];

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedStrategy) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = (ev.target?.result as string).split(",")[1] ?? "";
        const ext = file.name.split(".").pop()?.toUpperCase() ?? "TXT";
        uploadMutation.mutate({ strategyId: selectedStrategy, fileName: file.name, fileType: ext, content: b64 });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }, [selectedStrategy, uploadMutation]);

  return (
    <div className="space-y-4">
      {/* Strategy selector */}
      <select
        value={selectedStrategy}
        onChange={(e) => setSelectedStrategy(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-violet-500"
      >
        <option value="">Selectionnez une marque</option>
        {(strategies ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {!selectedStrategy ? (
        <EmptyState icon={Database} title="Selectionnez une marque" description="Choisissez une marque pour uploader des sources." />
      ) : (
        <>
          {/* Upload zone */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle bg-card p-6 transition-colors hover:border-violet-500">
              <Upload className="mb-2 h-8 w-8 text-foreground-muted" />
              <span className="text-xs font-medium text-foreground">Uploader des fichiers</span>
              <span className="text-[10px] text-foreground-muted">PDF, DOCX, XLSX, Images</span>
              <input type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt" onChange={handleUpload} />
            </label>
            <button onClick={() => setShowText(true)}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle bg-card p-6 transition-colors hover:border-violet-500">
              <Plus className="mb-2 h-8 w-8 text-foreground-muted" />
              <span className="text-xs font-medium text-foreground">Coller du texte</span>
            </button>
          </div>

          {/* Text modal */}
          {showText && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <input value={textLabel} onChange={(e) => setTextLabel(e.target.value)}
                placeholder="Label (optionnel)" className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground" />
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)}
                placeholder="Collez le texte ici..." rows={4}
                className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground" />
              <div className="flex gap-2">
                <button onClick={() => {
                  if (textInput.length > 10) textMutation.mutate({ strategyId: selectedStrategy, text: textInput, label: textLabel || undefined });
                  setShowText(false); setTextInput(""); setTextLabel("");
                }} className="rounded-lg bg-violet-600 px-4 py-2 text-xs text-white hover:bg-violet-700">Ajouter</button>
                <button onClick={() => setShowText(false)} className="rounded-lg border border-border-subtle px-4 py-2 text-xs text-foreground-muted">Annuler</button>
              </div>
            </div>
          )}

          {/* Sources list */}
          {sources.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Sources ({sources.length})</h3>
              <div className="space-y-2">
                {sources.map(src => (
                  <div key={src.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-background/50 px-4 py-2">
                    <FileText className="h-4 w-4 text-foreground-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{src.fileName ?? src.sourceType}</p>
                      <p className="text-[10px] text-foreground-muted">{src.fileType}</p>
                    </div>
                    <StatusBadge status={src.processingStatus} />
                    <button onClick={() => deleteMutation.mutate({ id: src.id })}
                      className="text-foreground-muted hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process button */}
          {sources.length > 0 && (
            <button disabled={processing} onClick={() => { setProcessing(true); processMutation.mutate({ strategyId: selectedStrategy }); }}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {processing ? "Analyse en cours..." : "Lancer l'analyse IA"}
            </button>
          )}

          {/* Pipeline status */}
          {statusQuery.data && statusQuery.data.results.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Piliers ({Math.round((statusQuery.data.progress ?? 0) * 100)}%)</h3>
              <div className="h-1.5 rounded-full bg-background-overlay mb-3">
                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(statusQuery.data.progress ?? 0) * 100}%` }} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
