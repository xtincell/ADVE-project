"use client";
import { LaunchModal } from "@/components/cockpit/sequence-launcher-panel";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { useToast } from "@/components/shared/notification-toast";
import { ArrowLeft, Download, Loader2, FileText, CheckCircle } from "lucide-react";
import { DeliverableContentValue } from "@/components/cockpit/deliverable-content-value";

// ─── Types ──────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  GLORY: "bg-info/15 text-info",
  ARTEMIS: "bg-error/15 text-error",
  SESHAT: "bg-success/15 text-success",
  CALC: "bg-warning/15 text-warning",
  PILLAR: "bg-warning/15 text-warning",
  MESTOR: "bg-accent/15 text-accent",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function DeliverableViewPage() {
  const params = useParams();
  const toast = useToast();
  const router = useRouter();
  const strategyId = useCurrentStrategyId();
  const key = params.key as string;
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const me = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const [showLaunch, setShowLaunch] = useState(false);
  const launchable = trpc.glory.launchableSequences.useQuery(undefined, { enabled: !!me.data?.canOperate });
  const sequence = launchable.data?.find(row => row.key === key);

  const manifest = trpc.glory.compileDeliverable.useQuery(
    { strategyId: strategyId ?? "", sequenceKey: key, selectedVersions },
    { enabled: !!strategyId && !!key },
  );

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const el = printRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: "#0a0a0a",
        useCORS: true,
        logging: false,
      } as any);

      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");

      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${manifest.data?.name ?? key}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF export failed:", err);
      toast.error("L'export PDF a échoué. Réessayez dans un instant.");
    } finally {
      setExporting(false);
    }
  };

  if (!strategyId || manifest.isLoading) return <SkeletonPage />;
  if (!manifest.data) {
    return (
      <div className="flex h-96 items-center justify-center text-foreground-muted">
        Livrable non trouve ou non compile.
      </div>
    );
  }

  const m = manifest.data;


  return (
    <div className="min-h-screen bg-background">
      {showLaunch && sequence ? <LaunchModal strategyId={strategyId} seq={sequence} onClose={() => setShowLaunch(false)} onSuccess={() => { setSelectedVersions({}); void utils.glory.compileDeliverable.invalidate(); void utils.glory.compilableDeliverables.invalidate(); }} /> : null}
      {/* Toolbar — not included in PDF */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6 py-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground-muted">{m.name}</span>
          {m.isComplete ? (
            <span className="inline-flex items-center gap-1 text-2xs text-success">
              <CheckCircle className="h-3 w-3" /> {m.sections.every(section => section.version?.approval === "ACCEPTED") ? "Relecture acceptée" : "Contenu complet · à relire"}
            </span>
          ) : (
            <span className="text-2xs text-warning">{m.meta.completedSteps}/{m.meta.totalSteps} sections</span>
          )}
          {me.data?.canOperate ? <button disabled={!sequence} onClick={() => setShowLaunch(true)} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50">{m.sections.length ? "Produire une nouvelle version" : "Générer le livrable"}</button> : null}
          <button
            onClick={handleExportPDF}
            disabled={exporting || !m.sections.length}
            className="flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-xs font-semibold text-white hover:bg-warning disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? "Export en cours..." : "Exporter PDF"}
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="mx-auto max-w-4xl px-8 py-12">
        {/* Cover */}
        <div className="mb-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted mb-4">LaFusee — {m.meta.sequenceName}</p>
          <h1 className="text-4xl font-black text-foreground mb-3">{m.name}</h1>
          <p className="text-lg text-foreground-secondary">{m.meta.strategyName}</p>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-foreground-muted">
            <span>{m.meta.generatedAt ? `Version produite le ${new Date(m.meta.generatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : "Aucune version exploitable produite"}</span>
            <span>•</span>
            <span>{m.sections.length} sections</span>
          </div>
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-warning/50 to-transparent" />
        </div>

        {!m.sections.length ? <p className="mb-8 rounded-xl border border-warning/30 p-4 text-warning">Les tentatives enregistrées n’ont pas produit de document exploitable. Lancez une nouvelle production ; les erreurs restent consultables dans l’historique.</p> : null}
        {m.history.length ? <details className="mb-8 rounded-xl border border-border p-4"><summary className="cursor-pointer text-foreground">Versions et tentatives ({m.history.length})</summary><ul className="mt-3 space-y-3">{m.history.slice().reverse().map(h => <li key={h.id} className="text-sm text-foreground-secondary"><strong>{h.title}</strong> · {h.usable ? `Version ${h.version}` : "Tentative échouée"} · {h.author}{h.engine ? ` (${h.engine})` : ""} · {new Date(h.createdAt).toLocaleString("fr-FR")}{h.usable ? <button className="ml-3 text-accent underline" onClick={() => setSelectedVersions(old => ({ ...old, [h.toolSlug]: h.id }))}>Consulter cette version</button> : null}</li>)}</ul></details> : null}
        {/* Table of contents */}
        <div className="mb-16">
          <h2 className="text-xs uppercase tracking-[0.2em] text-foreground-muted mb-4">Sommaire</h2>
          <div className="space-y-1">
            {m.sections.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="text-sm font-bold text-foreground-muted w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-sm text-foreground-secondary">{s.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${SOURCE_COLORS[s.sourceType] ?? "bg-surface-raised text-foreground-secondary"}`}>
                  {s.sourceType}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {m.sections.map((section, i) => {
          const content = section.content;
          const entries = Object.entries(content).filter(([k]) => !k.startsWith("_"));

          return (
            <div key={i} className="mb-16">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-black text-foreground-muted">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                  {section.version ? <p className="mt-1 text-xs text-foreground-secondary">Version {section.version.number} · {section.version.author}{section.version.engine ? ` (${section.version.engine})` : ""} · {new Date(section.version.createdAt).toLocaleString("fr-FR")}</p> : null}
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold mt-1 ${SOURCE_COLORS[section.sourceType] ?? "bg-surface-raised text-foreground-secondary"}`}>
                    {section.sourceType}
                  </span>
                </div>
              </div>

              {entries.length === 0 ? (
                <p className="text-sm text-foreground-muted italic">Section en attente de generation.</p>
              ) : (
                <div className="space-y-6">
                  {entries.map(([key, value]) => (
                    <div key={key}>
                      <h3 className="text-2xs font-bold uppercase tracking-wider text-foreground-muted mb-2">
                        {key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      {<DeliverableContentValue value={value} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Section divider */}
              {i < m.sections.length - 1 && (
                <div className="mt-12 h-px bg-gradient-to-r from-transparent via-surface-card to-transparent" />
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-border text-center">
          <p className="text-2xs text-foreground-muted">
            Document genere par LaFusee Industry OS — {m.meta.sequenceName} — {(m.meta.generatedAt ? new Date(m.meta.generatedAt).toLocaleDateString("fr-FR") : "Non produit")}
          </p>
        </div>
      </div>
    </div>
  );
}
