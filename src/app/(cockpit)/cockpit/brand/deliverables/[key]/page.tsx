"use client";

import { useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { ArrowLeft, Download, Loader2, FileText, CheckCircle } from "lucide-react";
import { getFieldLabel } from "@/components/cockpit/field-renderers";

// ─── Types ──────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  GLORY: "bg-blue-500/15 text-blue-400",
  ARTEMIS: "bg-rose-500/15 text-rose-400",
  SESHAT: "bg-teal-500/15 text-teal-400",
  CALC: "bg-orange-500/15 text-orange-400",
  PILLAR: "bg-amber-500/15 text-amber-400",
  MESTOR: "bg-violet-500/15 text-violet-400",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function DeliverableViewPage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = useCurrentStrategyId();
  const key = params.key as string;
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const manifest = trpc.glory.compileDeliverable.useQuery(
    { strategyId: strategyId ?? "", sequenceKey: key },
    { enabled: !!strategyId && !!key },
  );

  const seqOutputs = trpc.glory.getSequenceOutputs.useQuery(
    { strategyId: strategyId ?? "", sequenceKey: key },
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
      alert("Erreur lors de l'export PDF. Verifiez la console.");
    } finally {
      setExporting(false);
    }
  };

  if (!strategyId || manifest.isLoading) return <SkeletonPage />;
  if (!manifest.data) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        Livrable non trouve ou non compile.
      </div>
    );
  }

  const m = manifest.data;
  const outputMap = new Map(
    (seqOutputs.data?.outputs ?? []).map((o: any) => [o.toolSlug, o])
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Toolbar — not included in PDF */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6 py-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{m.name}</span>
          {m.isComplete ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Complet
            </span>
          ) : (
            <span className="text-[10px] text-amber-400">{m.meta.completedSteps}/{m.meta.totalSteps} sections</span>
          )}
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
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
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-4">LaFusee — {m.meta.sequenceName}</p>
          <h1 className="text-4xl font-black text-white mb-3">{m.name}</h1>
          <p className="text-lg text-zinc-400">{m.meta.strategyName}</p>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-600">
            <span>Genere le {new Date(m.meta.generatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>•</span>
            <span>{m.sections.length} sections</span>
          </div>
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        </div>

        {/* Table of contents */}
        <div className="mb-16">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">Sommaire</h2>
          <div className="space-y-1">
            {m.sections.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="text-sm font-bold text-zinc-600 w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-sm text-zinc-300">{s.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${SOURCE_COLORS[s.sourceType] ?? "bg-zinc-700 text-zinc-400"}`}>
                  {s.sourceType}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {m.sections.map((section, i) => {
          const output = outputMap.get(section.sourceToolSlug);
          const content = (output?.output ?? section.content ?? {}) as Record<string, unknown>;
          const entries = Object.entries(content).filter(([k]) => !k.startsWith("_"));

          return (
            <div key={i} className="mb-16">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-black text-zinc-800">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{section.title}</h2>
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold mt-1 ${SOURCE_COLORS[section.sourceType] ?? "bg-zinc-700 text-zinc-400"}`}>
                    {section.sourceType}
                  </span>
                </div>
              </div>

              {entries.length === 0 ? (
                <p className="text-sm text-zinc-600 italic">Section en attente de generation.</p>
              ) : (
                <div className="space-y-6">
                  {entries.map(([key, value]) => (
                    <div key={key}>
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        {key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      {renderValue(value)}
                    </div>
                  ))}
                </div>
              )}

              {/* Section divider */}
              {i < m.sections.length - 1 && (
                <div className="mt-12 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-700">
            Document genere par LaFusee Industry OS — {m.meta.sequenceName} — {new Date(m.meta.generatedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Renderers ──────────────────────────────────────────────────────────────

function renderValue(value: unknown): ReactNode {
  if (typeof value === "string") {
    // Long text — render as paragraphs
    if (value.length > 200) {
      return (
        <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {value}
        </div>
      );
    }
    return <p className="text-sm text-zinc-300">{value}</p>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm text-zinc-300 font-mono">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-xs text-zinc-600 italic">Vide</p>;

    // Array of strings
    if (typeof value[0] === "string") {
      return (
        <ul className="space-y-1">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="text-orange-500 mt-1 shrink-0">•</span>
              <span>{item as string}</span>
            </li>
          ))}
        </ul>
      );
    }

    // Array of objects
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3">
            {typeof item === "object" && item !== null ? (
              <div className="space-y-1">
                {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-zinc-500 shrink-0 min-w-[100px]">{getFieldLabel(k)}:</span>
                    <span className="text-zinc-300">{typeof v === "string" ? v : typeof v === "number" ? v.toLocaleString() : typeof v === "boolean" ? (v ? "Oui" : "Non") : Array.isArray(v) ? (v as unknown[]).map(x => typeof x === "string" ? x : typeof x === "object" && x !== null ? Object.values(x as Record<string, unknown>).filter(s => typeof s === "string").slice(0, 1).join("") || "(item)" : String(x)).slice(0, 5).join(", ") + (v.length > 5 ? ` +${v.length - 5}` : "") : typeof v === "object" && v !== null ? Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === "string").slice(0, 3).map(([kk, x]) => `${kk}: ${(x as string).slice(0, 40)}`).join(" · ") || "(structure)" : String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-300">{String(item)}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">{k.replace(/_/g, " ")}</span>
            <div className="mt-0.5">{renderValue(v)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-zinc-600">{String(value ?? "—")}</p>;
}
