/**
 * /launchpad/portfolio-bulk-import — Phase 18 (ADR-0059) Brand Tree.
 *
 * Wizard d'import de portefeuille multi-marques. Phase 18-A0 J5 ship un MVP :
 * - Saisie manuelle alternative directe (lien `/cockpit/portfolio`)
 * - Paste CSV (RAMADAN-style) avec preview parsing — vrai XLSX parser binary
 *   shipping en J5+1 (nécessite côté server-side xlsx parsing endpoint dédié)
 *
 * Manual-first parity (ADR-0060) garantie : la saisie manuelle est le mode
 * principal supporté à J5 ; l'import auto est une accélération opt-in.
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Upload, ArrowRight, AlertCircle, FileText } from "lucide-react";

// Format CSV/TSV attendu (header = nom des colonnes RAMADAN.xlsx)
const RAMADAN_HEADERS = ["N°", "TYPE", "ZONE", "PAYS", "MARQUE/SKU", "CATÉGORIE", "PACKAGING", "PROMO", "LIVRABLE", "LANGUE"];

interface ParsedRow {
  rowIndex: number;
  type?: string;
  zone?: string;
  pays?: string;
  marqueSku?: string;
  categorie?: string;
  packaging?: string;
  promo?: string;
  livrable?: string;
  langue?: string;
  raw: string[];
}

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [], error: "Au moins 2 lignes attendues (header + 1 row)." };

  // Auto-detect delimiter (comma / semicolon / tab)
  const firstLine = lines[0]!;
  const delim = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const headers = firstLine.split(delim).map((c) => c.trim());

  const rows: ParsedRow[] = lines.slice(1).map((line, i) => {
    const cells = line.split(delim).map((c) => c.trim());
    return {
      rowIndex: i + 2,
      raw: cells,
      type: cells[1],
      zone: cells[2],
      pays: cells[3],
      marqueSku: cells[4],
      categorie: cells[5],
      packaging: cells[6],
      promo: cells[7],
      livrable: cells[8],
      langue: cells[9],
    };
  });

  return { headers, rows };
}

export default function PortfolioBulkImportPage() {
  const [pasted, setPasted] = useState("");
  const [step, setStep] = useState<"INPUT" | "PREVIEW">("INPUT");
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [xlsxError, setXlsxError] = useState<string | null>(null);
  const [xlsxFileName, setXlsxFileName] = useState<string | null>(null);

  const { data: operator } = trpc.operator.getOwn.useQuery();

  const xlsxParseMutation = trpc.xlsxParser.parseFirstSheet.useMutation();

  /** Read .xlsx file → base64 → server parse → CSV → setPasted (reuses CSV preview pipeline). */
  async function handleXlsxFile(file: File) {
    setXlsxError(null);
    setXlsxFileName(file.name);
    setXlsxBusy(true);
    try {
      // Read as base64 (FileReader API).
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== "string") {
            reject(new Error("FileReader returned non-string"));
            return;
          }
          // result = "data:application/vnd...;base64,XXX" → strip prefix
          const comma = result.indexOf(",");
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.readAsDataURL(file);
      });

      const res = await xlsxParseMutation.mutateAsync({ base64 });
      setPasted(res.csv);
      setStep("INPUT"); // stay on INPUT so user reviews textarea before PREVIEW
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setXlsxError(msg);
    } finally {
      setXlsxBusy(false);
    }
  }

  const parsed = useMemo(() => (pasted.trim() ? parseCSV(pasted) : null), [pasted]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Import portefeuille multi-marques</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Importe un portefeuille FMCG (corporate → master brands → clusters → pays → product lines → SKUs) en 1 session.
        </p>
      </header>

      {/* Manual-first option */}
      <section className="rounded border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 text-accent" />
          <div className="flex-1">
            <h2 className="font-medium">Mode saisie manuelle</h2>
            <p className="mt-1 text-sm text-foreground-secondary">
              Pas de XLSX prêt ? Crée chaque BrandNode un par un via le form standalone. Recommandé pour les petits portefeuilles (1-10 nœuds).
            </p>
          </div>
          <Link
            href="/cockpit/portfolio"
            className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
          >
            Saisie manuelle <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Bulk paste import */}
      <section className="rounded border border-zinc-700">
        <header className="flex items-center gap-2 border-b border-zinc-700 px-4 py-2">
          <Upload className="h-4 w-4" />
          <h2 className="font-medium">Import CSV/TSV (RAMADAN-style)</h2>
        </header>

        {step === "INPUT" && (
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-foreground-secondary">
              Colle le contenu CSV/TSV avec ces colonnes (ordre flexible) : {RAMADAN_HEADERS.join(", ")}.
            </p>

            {/* Phase 18-A1 J5+1 — XLSX file upload (parser binary server-side) */}
            <div className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <div className="text-xs text-foreground-secondary">
                Tu as un .xlsx ? Charge le fichier directement — la première feuille est convertie en TSV automatiquement.
                {xlsxFileName && <span className="ml-2 font-mono text-[11px] text-accent">{xlsxFileName}</span>}
              </div>
              <label className={`inline-flex cursor-pointer items-center gap-1 rounded bg-zinc-800 px-3 py-1 text-xs font-medium hover:bg-zinc-700 ${xlsxBusy ? "opacity-50" : ""}`}>
                <Upload className="h-3 w-3" />
                {xlsxBusy ? "Conversion…" : "Choisir .xlsx"}
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  disabled={xlsxBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleXlsxFile(f);
                    // reset input so the same file can be re-uploaded
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {xlsxError && (
              <div className="flex items-start gap-2 rounded bg-error/15 p-2 text-xs text-error">
                <AlertCircle className="mt-0.5 h-3 w-3" /> XLSX parser : {xlsxError}
              </div>
            )}

            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={`N°\tTYPE\tZONE\tPAYS\tMARQUE/SKU\tCATÉGORIE\tPACKAGING\tPROMO\tLIVRABLE\tLANGUE\n1\tVISUEL\tCôte d'Ivoire\tCôte d'Ivoire\tEVAP FC 160g\tEVAP\tUnstackable\t10g more\tOOH 12M²\tFrançais\n…`}
              rows={10}
              className="w-full rounded border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs"
            />
            <div className="flex gap-2">
              <button
                disabled={!parsed || (parsed.error !== undefined)}
                onClick={() => setStep("PREVIEW")}
                className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
              >
                Analyser le contenu →
              </button>
            </div>
            {parsed?.error && (
              <div className="flex items-start gap-2 rounded bg-error/15 p-2 text-sm text-error">
                <AlertCircle className="mt-0.5 h-4 w-4" /> {parsed.error}
              </div>
            )}
          </div>
        )}

        {step === "PREVIEW" && parsed && !parsed.error && (
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                <strong>{parsed.rows.length}</strong> rows détectées avec {parsed.headers.length} colonnes.
              </p>
              <button
                onClick={() => setStep("INPUT")}
                className="text-xs text-foreground-secondary underline hover:text-foreground"
              >
                ← Retour édition
              </button>
            </div>

            <div className="max-h-96 overflow-auto rounded border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr>
                    <th className="border-b border-zinc-700 p-1.5 text-left">#</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">TYPE</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">ZONE</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">PAYS</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">SKU</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">CAT</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">PACK</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">PROMO</th>
                    <th className="border-b border-zinc-700 p-1.5 text-left">LIVRABLE</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 50).map((row) => (
                    <tr key={row.rowIndex} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                      <td className="p-1.5 font-mono text-foreground-secondary">{row.rowIndex}</td>
                      <td className="p-1.5">{row.type ?? "—"}</td>
                      <td className="p-1.5">{row.zone ?? "—"}</td>
                      <td className="p-1.5">{row.pays ?? "—"}</td>
                      <td className="p-1.5 font-medium">{row.marqueSku ?? "—"}</td>
                      <td className="p-1.5">{row.categorie ?? "—"}</td>
                      <td className="p-1.5">{row.packaging ?? "—"}</td>
                      <td className="p-1.5">{row.promo ?? "—"}</td>
                      <td className="p-1.5">{row.livrable ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 50 && (
                <div className="p-2 text-center text-xs text-foreground-secondary">
                  … {parsed.rows.length - 50} rows additionnels masqués (preview limité à 50).
                </div>
              )}
            </div>

            <div className="rounded bg-amber-500/15 p-3 text-sm text-amber-300">
              <strong>Phase 18-A0 J5 — MVP preview only.</strong> La matérialisation auto via Intent <code>OPERATOR_CREATE_BRAND_NODE</code> + <code>OPERATOR_CREATE_CAMPAIGN_DELIVERABLE</code> en boucle sera shippée en J5+1 (mapping LLM ZONE → clusterTag + déduplication MARQUE → MASTER_BRAND déjà existant). En attendant, copie les SKUs identifiés vers <Link href="/cockpit/portfolio" className="underline">le portfolio cockpit</Link> via saisie manuelle.
              {operator && <p className="mt-2 text-xs opacity-70">Operator courant : {operator.name}</p>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
