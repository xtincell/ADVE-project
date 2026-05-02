"use client";

/**
 * /console/governance/model-policy — admin UI for the governed
 * `purpose → model` registry. Reads via `governance.modelPolicyList`
 * (cached service); writes via `governance.modelPolicyUpdate` which is a
 * `governedProcedure({ kind: "UPDATE_MODEL_POLICY" })` so each change is
 * hash-chained in IntentEmission.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Edit3, RefreshCw, AlertCircle } from "lucide-react";

type Purpose = "final-report" | "agent" | "intermediate" | "intake-followup" | "extraction";
type PipelineVersion = "V1" | "V2" | "V3";

interface PolicyRow {
  purpose: Purpose;
  anthropicModel: string;
  ollamaModel: string | null;
  allowOllamaSubstitution: boolean;
  pipelineVersion: PipelineVersion;
  version: number;
  notes: string | null;
}

const PURPOSE_LABEL: Record<Purpose, string> = {
  "final-report": "Final report",
  agent: "Agent / reasoning",
  intermediate: "Intermediate",
  "intake-followup": "Intake follow-up",
  extraction: "Extraction",
};

const PURPOSE_DESC: Record<Purpose, string> = {
  "final-report": "Livrables finaux écrits — rapport intake, sections Oracle. Quality-first.",
  agent: "Reasoning de fond — recommandations, drafts narratifs, batch tooling.",
  intermediate: "Synonyme d'agent ; permet de diverger plus tard sans toucher au code.",
  "intake-followup": "Génération adaptive de questions pendant le funnel intake. Volume élevé, jetable.",
  extraction: "Extraction structurée depuis du texte libre (parsing intake → champs ADVE).",
};

export default function ModelPolicyPage() {
  const policies = trpc.governance.modelPolicyList.useQuery();
  const update = trpc.governance.modelPolicyUpdate.useMutation({
    onSuccess: () => {
      void policies.refetch();
      setEditing(null);
    },
  });
  const [editing, setEditing] = useState<PolicyRow | null>(null);

  if (policies.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Model Policy"
        description="Registre gouverné — purpose → modèle Anthropic / Ollama. Chaque modification crée un IntentEmission UPDATE_MODEL_POLICY hash-chained."
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => policies.refetch()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:border-border"
        >
          <RefreshCw className="h-3 w-3" /> Rafraîchir
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-background">
            <tr className="text-left text-[10px] uppercase tracking-wider text-foreground-muted">
              <th className="px-3 py-2">Purpose</th>
              <th className="px-3 py-2">Anthropic model</th>
              <th className="px-3 py-2">Ollama substitute</th>
              <th className="px-3 py-2">Pipeline</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {policies.data?.map((p) => (
              <tr key={p.purpose} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-mono text-foreground">{p.purpose}</div>
                  <div className="text-[10px] text-foreground-muted">{PURPOSE_DESC[p.purpose as Purpose]}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-foreground-secondary">{p.anthropicModel}</td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {p.ollamaModel ? (
                    <span className={p.allowOllamaSubstitution ? "text-success" : "text-foreground-muted line-through"}>
                      {p.ollamaModel}
                    </span>
                  ) : (
                    <span className="text-foreground-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium " +
                      (p.pipelineVersion === "V3"
                        ? "border-success/60 bg-success/30 text-success"
                        : p.pipelineVersion === "V2"
                          ? "border-warning/60 bg-warning/30 text-warning"
                          : "border-border bg-background text-foreground-secondary")
                    }
                  >
                    {p.pipelineVersion}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-foreground-muted">v{p.version}</td>
                <td className="px-3 py-2 max-w-[260px] text-[11px] text-foreground-muted">
                  <span className="line-clamp-2">{p.notes ?? "—"}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(p as PolicyRow)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground-secondary hover:border-border"
                  >
                    <Edit3 className="h-3 w-3" /> Édit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-foreground-muted">
        Les modifications passent par <code>UPDATE_MODEL_POLICY</code> (Mestor → Artemis →
        model-policy.updatePolicy). Cache LLM Gateway invalidé automatiquement.
      </p>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Édit policy — ${PURPOSE_LABEL[editing.purpose]}` : ""}
        size="lg"
      >
        {editing && (
          <PolicyEditor
            initial={editing}
            isPending={update.isPending}
            error={update.error?.message}
            onSubmit={(values) => update.mutate(values)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function PolicyEditor({
  initial,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  initial: PolicyRow;
  isPending: boolean;
  error?: string;
  onSubmit: (values: {
    purpose: Purpose;
    anthropicModel: string;
    ollamaModel: string | null;
    allowOllamaSubstitution: boolean;
    pipelineVersion: PipelineVersion;
    notes: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [anthropicModel, setAnthropicModel] = useState(initial.anthropicModel);
  const [ollamaModel, setOllamaModel] = useState(initial.ollamaModel ?? "");
  const [allowOllamaSubstitution, setAllow] = useState(initial.allowOllamaSubstitution);
  const [pipelineVersion, setPipelineVersion] = useState<PipelineVersion>(initial.pipelineVersion);
  const [notes, setNotes] = useState(initial.notes ?? "");

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground-muted">
        {PURPOSE_DESC[initial.purpose]}
      </p>

      <FormField label="Modèle Anthropic">
        <input
          value={anthropicModel}
          onChange={(e) => setAnthropicModel(e.target.value)}
          placeholder="claude-sonnet-4-20250514"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </FormField>

      <FormField label="Modèle Ollama (vide = pas de substitution possible)">
        <input
          value={ollamaModel}
          onChange={(e) => setOllamaModel(e.target.value)}
          placeholder="llama3.1:70b"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </FormField>

      <FormField label="Substitution Ollama autorisée">
        <label className="flex items-center gap-2 text-xs text-foreground-secondary">
          <input
            type="checkbox"
            checked={allowOllamaSubstitution}
            onChange={(e) => setAllow(e.target.checked)}
            disabled={!ollamaModel.trim()}
          />
          Quand <code>OLLAMA_BASE_URL</code> est configuré, utiliser Ollama au lieu d'Anthropic
        </label>
      </FormField>

      <FormField label="Pipeline version">
        <select
          value={pipelineVersion}
          onChange={(e) => setPipelineVersion(e.target.value as PipelineVersion)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="V1">V1 — direct Sonnet (legacy, ADVE-anchored)</option>
          <option value="V2">V2 — RAG-augmented Sonnet→Opus (deprecated, kept for parity)</option>
          <option value="V3">V3 — RTIS-first: 4× RTIS draft + tension synth + Opus diagnostic+reco</option>
        </select>
        <p className="mt-1 text-[10px] text-foreground-muted">
          V3 emits BOTH a diagnostic block (ADVE verbatim + RTIS RAG-grounded)
          AND an autonomous Opus recommendation (strategicMove + 3-5 actions +
          90-day roadmap). Cost ~5× V1. Use the bench script before switching.
        </p>
      </FormField>

      <FormField label="Notes (audit)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-error/60 bg-error/30 p-2 text-[11px] text-error">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:border-border"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={isPending || !anthropicModel.trim()}
          onClick={() =>
            onSubmit({
              purpose: initial.purpose,
              anthropicModel: anthropicModel.trim(),
              ollamaModel: ollamaModel.trim() || null,
              allowOllamaSubstitution,
              pipelineVersion,
              notes: notes.trim() || null,
            })
          }
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-semibold text-black hover:bg-warning disabled:opacity-50"
        >
          {isPending ? "Émission UPDATE_MODEL_POLICY…" : "Appliquer (governed)"}
        </button>
      </div>
    </div>
  );
}
