import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession } from "@/server/brand";
import {
  getLatestDeliverable,
  ORACLE_KIND,
  parseOracleDocument,
} from "@/server/deliverables";
import { MarkdownView } from "@/components/pillars/markdown-view";
import { PrintButton } from "@/components/pillars/print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Oracle — version imprimable" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Version imprimable de l'Oracle — le « PDF » est l'impression navigateur :
 * honnête, fidèle, zéro dépendance. Document clair sur fond blanc, header
 * brandé, sections insécables (`break-inside-avoid`), chrome applicatif
 * masqué par `print:hidden` (layout + toolbar).
 */
export default async function OraclePrintPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/oracle/print");

  const brand = await getBrandForSession(session);
  if (!brand) redirect("/app");

  const deliverable = await getLatestDeliverable(brand.id, ORACLE_KIND);
  const doc = deliverable ? parseOracleDocument(deliverable.content) : null;
  if (!doc) redirect("/app/oracle");

  const insufficient = doc.sections.filter((s) => s.status === "insuffisant").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none print:space-y-0">
      {/* Toolbar écran — jamais imprimée */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/app/oracle"
          className="inline-flex items-center gap-1.5 text-sm text-sand transition-colors hover:text-bone"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour à l&apos;Oracle
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-lg bg-white p-10 text-ink shadow-card print:rounded-none print:p-0 print:shadow-none">
        {/* Header brandé */}
        <header className="border-b-2 border-coral pb-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="eyebrow text-coral">
              La Fusée<span className="text-ink"> · by UPgraders</span>
            </p>
            <p className="font-mono text-xs text-smoke">
              {deliverable?.composedAt ? DATE_FORMAT.format(deliverable.composedAt) : ""}
            </p>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            Oracle — {doc.brand.name}
          </h1>
          <p className="mt-2 text-sm text-smoke">
            Document stratégique · {doc.sections.length} sections
            {doc.brand.sector ? ` · ${doc.brand.sector}` : ""}
          </p>
          <p className="mt-3 text-sm font-semibold text-graphite">
            Score structurel {doc.score.total}/{doc.score.max} · Palier {doc.score.levelLabel}
            {insufficient > 0
              ? ` · ${insufficient} section${insufficient > 1 ? "s" : ""} en attente de données`
              : ""}
          </p>
        </header>

        {/* Sections — insécables à l'impression */}
        {doc.sections.map((section) => (
          <section
            key={section.id}
            className="break-inside-avoid border-b border-ink/10 py-6 last:border-b-0"
          >
            {section.status === "insuffisant" ? (
              <div className="rounded-md border border-warning/50 bg-warning/10 p-4">
                <MarkdownView markdown={section.markdown} tone="light" />
              </div>
            ) : (
              <MarkdownView markdown={section.markdown} tone="light" />
            )}
            {section.sources.length > 0 ? (
              <p className="mt-3 font-mono text-[10px] text-smoke-2">
                Sources : {section.sources.join(" · ")}
              </p>
            ) : null}
          </section>
        ))}

        <footer className="pt-6 text-center text-xs text-smoke">
          Composé de manière déterministe depuis les piliers déclarés de la marque —
          les sections marquées « données insuffisantes » attendent des données réelles,
          jamais des inventions. La Fusée · UPgraders.
        </footer>
      </article>

      {/* Réglages d'impression (marges + fidélité des fonds) */}
      <style>{`
        @media print {
          @page { margin: 14mm; }
          body { background: #ffffff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
