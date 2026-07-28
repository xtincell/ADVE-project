"use client";

/**
 * Livre de marque — la vue HTML, pair de l'Oracle (ADR-0185).
 *
 * Ce que le porteur de marque ouvre pour savoir ce qu'EST sa marque. Composé,
 * pas généré : chaque ligne vient d'un pilier déclaré ou d'un document déposé,
 * et le dit. Ce qui n'existe ni dans l'un ni dans l'autre reste **vide et
 * nommé** — un livre de marque qui comblerait ses trous cesserait d'être une
 * référence.
 *
 * Lecture seule. Zéro modèle de langage sur ce chemin.
 */

import { useState } from "react";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { trpc } from "@/lib/trpc/client";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { BookOpen, FileText, Loader2, ShieldQuestion } from "lucide-react";

/** Provenance d'une valeur → ce que le porteur doit en comprendre. */
const PROVENANCE_LABEL: Record<string, { label: string; cls: string; title: string }> = {
  HUMAN: {
    label: "Décidé",
    cls: "bg-success/15 text-success",
    title: "Valeur saisie ou validée explicitement.",
  },
  SOURCE: {
    label: "Tiré d'un document",
    cls: "bg-info/15 text-info",
    title: "Valeur extraite d'un document que vous avez déposé.",
  },
  INFERRED: {
    label: "Déduit",
    cls: "bg-warning/15 text-warning",
    title: "Valeur proposée par déduction — à confirmer.",
  },
  UNKNOWN: {
    label: "Origine non tracée",
    cls: "bg-white/10 text-foreground-muted",
    title: "Valeur antérieure au suivi de provenance.",
  },
};

/** Rendu lisible d'une valeur de pilier — jamais un dump JSON brut. */
function Value({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm text-foreground">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.slice(0, 24).map((v, i) => (
          <li key={i} className="border-l-2 border-white/10 pl-3">
            <Value value={v} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object" && depth < 4) {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, unknown>)
          .filter(([k]) => !k.startsWith("_"))
          .slice(0, 24)
          .map(([k, v]) => (
            <div key={k}>
              <span className="text-2xs uppercase tracking-wide text-foreground-muted">{k}</span>
              <Value value={v} depth={depth + 1} />
            </div>
          ))}
      </div>
    );
  }
  return null;
}

export default function BrandBiblePage() {
  const strategyId = useCurrentStrategyId();
  const [includeDerived, setIncludeDerived] = useState(false);
  const [exporting, setExporting] = useState(false);

  const bible = trpc.brandBible.get.useQuery(
    { strategyId: strategyId ?? "", includeDerived },
    { enabled: !!strategyId },
  );

  if (!strategyId || bible.isLoading) return <SkeletonPage />;
  const doc = bible.data;
  if (!doc) return <SkeletonPage />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BookOpen className="h-5 w-5 text-accent" />
            Livre de {doc.brandName}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Ce que votre marque déclare, et d&apos;où chaque élément vient. Rien n&apos;est écrit ici
            qui ne soit dans vos piliers ou dans vos documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIncludeDerived((v) => !v)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-foreground-secondary hover:bg-white/5"
          >
            {includeDerived ? "Socle seul" : "Tout afficher"}
          </button>
          <button
            onClick={async () => {
              setExporting(true);
              try {
                const res = await fetch(`/api/export/brand-bible/${strategyId}/pdf`);
                if (!res.ok) throw new Error(String(res.status));
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `livre-de-marque-${doc.brandName}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                console.error("[brand-bible] export failed:", e);
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            Exporter en PDF
          </button>
        </div>
      </div>

      {/* Couverture réelle — un livre à moitié vide le dit en tête. */}
      <div className="rounded-lg border border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="text-foreground">
            {doc.coverage.pct != null ? (
              <>
                <span className="font-semibold">{doc.coverage.pct}%</span> complété
              </>
            ) : (
              <span className="text-foreground-muted">Complétude non mesurée</span>
            )}
            <span className="text-foreground-muted">
              {" "}
              ({doc.coverage.filled}/{doc.coverage.total} éléments renseignés)
            </span>
          </span>
          <span className="text-foreground-muted">
            {doc.sourcesUsed > 0
              ? `${doc.sourcesUsed} document${doc.sourcesUsed > 1 ? "s" : ""} cité${doc.sourcesUsed > 1 ? "s" : ""}`
              : "Aucun document cité"}
          </span>
        </div>
        {doc.retrieval === "NONE" ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground-muted">
            <ShieldQuestion className="mt-px h-3.5 w-3.5 flex-shrink-0" />
            Aucun document de marque n&apos;est exploitable : ce livre ne repose que sur ce que vous
            avez déclaré. Déposez vos documents dans vos sources pour qu&apos;ils y figurent.
          </p>
        ) : null}
      </div>

      {doc.sections.map((section) => (
        <section key={section.pillarKey} className="space-y-3 rounded-lg border border-white/10 p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <p className="text-xs text-foreground-muted">{section.blurb}</p>
          </div>

          {section.entries.length === 0 ? (
            <p className="text-sm text-warning">
              Rien de déclaré sur ce volet — {section.missing.length} élément
              {section.missing.length > 1 ? "s" : ""} à renseigner.
            </p>
          ) : (
            <div className="space-y-3">
              {section.entries.map((entry) => {
                const prov = PROVENANCE_LABEL[entry.provenance] ?? PROVENANCE_LABEL.UNKNOWN!;
                return (
                  <div key={entry.field} className="rounded border border-white/5 bg-white/[0.02] p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{entry.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${prov.cls}`}
                        title={prov.title}
                      >
                        {prov.label}
                      </span>
                    </div>
                    <Value value={entry.value} />
                  </div>
                );
              })}
            </div>
          )}

          {section.missing.length > 0 && section.entries.length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-foreground-muted">
                {section.missing.length} élément{section.missing.length > 1 ? "s" : ""} non renseigné
                {section.missing.length > 1 ? "s" : ""}
              </summary>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {section.missing.map((m) => (
                  <li key={m.field} className="rounded-full bg-white/5 px-2 py-0.5 text-foreground-muted">
                    {m.label}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {section.citations.length > 0 ? (
            <div className="space-y-2 rounded border border-white/5 bg-black/20 p-3">
              <p className="text-2xs uppercase tracking-wide text-foreground-muted">
                Ce que vos documents en disent
              </p>
              {section.citations.map((c) => (
                <div key={c.sourceId}>
                  <p className="text-2xs text-foreground-muted">
                    {c.fileName} — {c.certainty}
                  </p>
                  <p className="whitespace-pre-wrap text-xs text-foreground-secondary">
                    {c.excerpt.slice(0, 700)}
                    {c.excerpt.length > 700 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
