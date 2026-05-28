"use client";

/**
 * Console — HYBRID Glory tool peer-toggle panel (Phase 23 Epic 5 Story 5.5, UX-DR13).
 *
 * Surfaces a HYBRID measurement Glory tool with TWO peer paths of equal visual
 * weight — "Exécution LLM" and "Saisie manuelle" — so the operator can choose the
 * manual path deliberately (not only fall into it on failure). Both paths dispatch
 * through `glory.executeHybrid` → `executeHybridTool` (never `executeStructuredLLMCall`
 * direct — invariant HARD-tested in Story 5.6).
 *
 * Design constraints (3 DS prohibitions apply — lives under `src/components/**`) :
 * semantic design tokens only, no raw zinc/violet classes, CVA-free single-variant
 * markup. The manual form is schema-driven (UX-DR9) — generated from the tool's
 * `manualFormSchema` JSON-Schema projection (`glory.getManualForm`), not hand-coded
 * per tool. LLM-path progress announces over a `role="status" aria-live="polite"`
 * region (UX-DR17). Switching tabs preserves entered data (state lives in the panel).
 *
 * When an LLM run returns `path: "manual-required"` (Zod-invalid after retries), the
 * panel drops the operator on the SAME manual form as the peer tab.
 */

import { useState } from "react";
import { Cpu, PencilLine, Play, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

type FieldSchema = {
  type?: string | string[];
  enum?: Array<string | number | boolean | null>;
  description?: string;
};

type ObjectSchema = {
  type?: string;
  properties?: Record<string, FieldSchema>;
  required?: string[];
};

type Strategy = { id: string; name: string };

function fieldWidget(schema: FieldSchema): "select" | "boolean" | "number" | "string" | "json" {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return "select";
  const t = Array.isArray(schema.type) ? schema.type.find((x) => x !== "null") : schema.type;
  if (t === "boolean") return "boolean";
  if (t === "number" || t === "integer") return "number";
  if (t === "string") return "string";
  return "json"; // array / object / nullable / unknown → raw JSON entry
}

export function HybridToolPanel({ slug, strategies }: { slug: string; strategies: Strategy[] }) {
  const [tab, setTab] = useState<"llm" | "manual">("llm");
  const [strategyId, setStrategyId] = useState<string>(strategies[0]?.id ?? "");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const formQuery = trpc.glory.getManualForm.useQuery({ slug }, { enabled: !!slug });
  const properties = (formQuery.data?.jsonSchema as ObjectSchema | undefined)?.properties ?? {};
  const requiredKeys = (formQuery.data?.jsonSchema as ObjectSchema | undefined)?.required ?? [];

  const [result, setResult] = useState<{ path: string; status?: string; output: Record<string, unknown> } | null>(null);
  const exec = trpc.glory.executeHybrid.useMutation({
    onSuccess: (data) => {
      const output = data.output as Record<string, unknown>;
      setResult({ path: data.path, status: output.status as string | undefined, output });
      // Zod-invalid LLM output → drop on the SAME manual form (peer tab).
      if (data.path === "manual-required") setTab("manual");
    },
  });

  const noStrategy = !strategyId;

  function runLlm() {
    setResult(null);
    setFormError(null);
    exec.mutate({ toolSlug: slug, strategyId, input: {}, preferManual: false });
  }

  function submitManual() {
    setResult(null);
    setFormError(null);
    const manualEntry: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(properties)) {
      const raw = formValues[key];
      if (raw === undefined || raw === "") continue;
      const widget = fieldWidget(schema);
      try {
        if (widget === "boolean") manualEntry[key] = raw === "true";
        else if (widget === "number") manualEntry[key] = Number(raw);
        else if (widget === "json") manualEntry[key] = JSON.parse(raw);
        else manualEntry[key] = raw;
      } catch {
        setFormError(`Champ « ${key} » : JSON invalide.`);
        return;
      }
    }
    exec.mutate({ toolSlug: slug, strategyId, input: {}, preferManual: true, manualEntry });
  }

  const statusMessage = exec.isPending
    ? tab === "llm"
      ? "Exécution LLM en cours…"
      : "Validation de la saisie manuelle…"
    : result
      ? result.path === "manual-required"
        ? "Sortie LLM invalide — bascule sur la saisie manuelle."
        : result.status === "FAILED"
          ? "Échec — voir le détail ci-dessous."
          : "Terminé."
      : "";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
          Outil HYBRID — chemins pairs
        </p>
        <select
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value)}
          aria-label="Marque cible"
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="">Choisir une marque…</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Peer tabs — equal visual weight (UX-DR13) */}
      <div role="tablist" aria-label="Chemin d'exécution" className="grid grid-cols-2 gap-2">
        <button
          role="tab"
          aria-selected={tab === "llm"}
          onClick={() => setTab("llm")}
          className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            tab === "llm" ? "border-accent bg-accent/10 text-accent" : "border-border bg-background text-foreground-secondary hover:text-foreground"
          }`}
        >
          <Cpu className="h-4 w-4" /> Exécution LLM
        </button>
        <button
          role="tab"
          aria-selected={tab === "manual"}
          onClick={() => setTab("manual")}
          className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            tab === "manual" ? "border-accent bg-accent/10 text-accent" : "border-border bg-background text-foreground-secondary hover:text-foreground"
          }`}
        >
          <PencilLine className="h-4 w-4" /> Saisie manuelle
        </button>
      </div>

      {noStrategy && (
        <p className="text-xs text-foreground-muted">Sélectionnez une marque pour exécuter cet outil.</p>
      )}

      {/* LLM path */}
      {tab === "llm" && (
        <div role="tabpanel" className="space-y-2">
          <p className="text-xs text-foreground-secondary">
            Lance le tool via le LLM (schéma strict, retry ×2). Sur sortie invalide, bascule
            automatiquement sur le formulaire manuel pair.
          </p>
          <button
            onClick={runLlm}
            disabled={exec.isPending || noStrategy}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {exec.isPending && tab === "llm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Lancer (LLM)
          </button>
        </div>
      )}

      {/* Manual path — schema-driven form (UX-DR9, form-single-column) */}
      {tab === "manual" && (
        <div role="tabpanel" className="space-y-3">
          {formQuery.isLoading ? (
            <p className="text-xs text-foreground-muted">Chargement du formulaire…</p>
          ) : Object.keys(properties).length === 0 ? (
            <p className="text-xs text-foreground-muted">Aucun schéma manuel disponible.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(properties).map(([key, schema]) => {
                const widget = fieldWidget(schema);
                const isRequired = requiredKeys.includes(key);
                const value = formValues[key] ?? "";
                const setVal = (v: string) => setFormValues((prev) => ({ ...prev, [key]: v }));
                return (
                  <label key={key} className="block space-y-1">
                    <span className="text-xs font-medium text-foreground-secondary">
                      {key}
                      {isRequired && <span className="ml-1 text-error">*</span>}
                    </span>
                    {widget === "select" ? (
                      <select
                        value={value}
                        onChange={(e) => setVal(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
                      >
                        <option value="">—</option>
                        {(schema.enum ?? []).map((opt) => (
                          <option key={String(opt)} value={String(opt)}>
                            {String(opt)}
                          </option>
                        ))}
                      </select>
                    ) : widget === "boolean" ? (
                      <select
                        value={value}
                        onChange={(e) => setVal(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
                      >
                        <option value="">—</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : widget === "number" ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setVal(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    ) : widget === "json" ? (
                      <textarea
                        value={value}
                        onChange={(e) => setVal(e.target.value)}
                        rows={3}
                        placeholder='JSON — ex: ["…"] ou {"…": …}'
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setVal(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}
          {formError && (
            <p className="flex items-center gap-1.5 text-xs text-error">
              <AlertTriangle className="h-3.5 w-3.5" /> {formError}
            </p>
          )}
          <button
            onClick={submitManual}
            disabled={exec.isPending || noStrategy}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {exec.isPending && tab === "manual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Valider la saisie
          </button>
        </div>
      )}

      {/* Status region (UX-DR17) */}
      <div role="status" aria-live="polite" className="min-h-[1.25rem] text-xs text-foreground-muted">
        {statusMessage}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-md border p-3 ${
            result.status === "FAILED" || result.path === "manual-required"
              ? "border-error/40 bg-error/5"
              : "border-border bg-background/80"
          }`}
        >
          <p className="mb-1 text-[10px] font-bold uppercase text-foreground-muted">
            Résultat — chemin {result.path}
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-foreground-secondary">
            {JSON.stringify(result.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
