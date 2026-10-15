"use client";

/**
 * /console/governance/model-policy — admin UI for the governed
 * `purpose → model` registry. Reads via `governance.modelPolicyList`
 * (cached service); writes via `governance.modelPolicyUpdate` which is a
 * `governedProcedure({ kind: "UPDATE_MODEL_POLICY" })` so each change is
 * hash-chained in IntentEmission.
 */

import { useState } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { FriendlyError } from "@/components/shared/friendly-error";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";
import { Edit3, RefreshCw, AlertCircle } from "lucide-react";

type PolicyRow = RouterOutputs["governance"]["modelPolicyList"][number];
type Purpose = PolicyRow["purpose"];
type PipelineVersion = PolicyRow["pipelineVersion"];

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
  const routing = policies.isError ? undefined : policies.data?.[0]?.routing;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Model Policy"
        description="Routage texte du Gateway et réglages enregistrés par usage. La lecture ne lance aucun appel de modèle."
      />

      <div className="flex items-center justify-end">
        <Button
          type="button"
          onClick={() => policies.refetch()}
          variant="outline"
          size="sm"
          loading={policies.isFetching}
        >
          <RefreshCw className="h-3 w-3" /> Rafraîchir
        </Button>
      </div>

      <FriendlyError error={policies.error} />
      {routing && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-raised p-4 text-sm">
          <p className="font-medium text-foreground">
            Priorité du déploiement : {routing.explicitPrimary ?? "ordre par défaut"}
            {routing.premium ? " · mode premium activé" : " · mode premium désactivé"}
          </p>
          {routing.subscriptionOnly && (
            <p className="text-foreground-secondary">
              Abonnement OpenAI exclusivement choisi. Les réglages Anthropic et Ollama restent
              enregistrés ; leur édition ne remplace pas ce raccord. S’il est incomplet ou
              bloqué, aucun autre fournisseur n’est tenté.
            </p>
          )}
          <p className="text-xs text-foreground-muted">
            Instantané de ce processus : tentative texte par défaut, avant overrides par appel,
            budget de marque et régulation du débit ; hors vision et vidéo. Configuration et
            circuit ne prouvent ni validité des accès, quota disponible, facture ou santé globale.
            Le pipeline de final-report règle le rapport d’intake, indépendamment du modèle.
          </p>
        </div>
      )}

      {!policies.isError && (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-background">
            <tr className="text-left text-[10px] uppercase tracking-wider text-foreground-muted">
              <th className="px-3 py-2">Purpose</th>
              <th className="px-3 py-2">Routage texte prévu</th>
              <th className="px-3 py-2">Anthropic enregistré</th>
              <th className="px-3 py-2">Ollama enregistré</th>
              <th className="px-3 py-2">Pipeline enregistré</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Notes enregistrées</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {policies.data?.map((p) => (
              <tr key={p.purpose} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-mono text-foreground">{p.purpose}</div>
                  <div className="text-[10px] text-foreground-muted">{PURPOSE_DESC[p.purpose]}</div>
                </td>
                <td className="min-w-56 px-3 py-2">
                  {p.routing.attempts.length ? (
                    <ol className="list-inside list-decimal space-y-2">
                      {p.routing.attempts.map((attempt) => (
                        <li key={attempt.provider}>
                          <span className="font-mono text-foreground">{attempt.provider} / {attempt.model}</span>
                          <div className="text-foreground-muted">
                            {attempt.eligible ? "Configuration / circuit autorisent la tentative"
                              : "Configuration absente ou circuit bloqué"}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-warning">Aucun candidat : raccord incomplet ou circuit bloqué.</p>
                  )}
                  <p className="mt-2 text-foreground-muted">Politique lue v{p.routing.policyVersion}</p>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-foreground-secondary">{p.anthropicModel}</td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {p.ollamaModel ? (
                    <span>
                      {p.ollamaModel}
                      <span className="block text-foreground-muted">
                        {p.allowOllamaSubstitution ? "Substitution autorisée" : "Substitution désactivée"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-foreground-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge tone="neutral">{p.pipelineVersion}</Badge>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-foreground-muted">v{p.version}</td>
                <td className="px-3 py-2 max-w-[260px] text-[11px] text-foreground-muted">
                  <span className="line-clamp-2">{p.notes ?? "—"}</span>
                  <span className="block">Historique saisi, pas un état du routage.</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    onClick={() => setEditing(p)}
                    variant="outline"
                    size="sm"
                    aria-label={`Modifier les réglages ${p.purpose}`}
                  >
                    <Edit3 className="h-3 w-3" /> Modifier
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <p className="text-[10px] text-foreground-muted">
        Les modifications passent par <code>UPDATE_MODEL_POLICY</code> (Mestor → Artemis →
        model-policy.updatePolicy). Cache invalidé dans le processus écrivain ; lecture
        des autres processus sous 60 secondes. Le rapport d’intake consulte le pipeline
        de final-report ; les autres valeurs de pipeline sont seulement enregistrées.
      </p>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Réglages enregistrés — ${PURPOSE_LABEL[editing.purpose]}` : ""}
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
      {initial.routing.explicitPrimary && (
        <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          Priorité du déploiement : {initial.routing.explicitPrimary}. Ces champs enregistrent
          la politique ; ils ne changent pas cette priorité.
        </p>
      )}

      <FormField label="Modèle Anthropic">
        <input
          aria-label="Modèle Anthropic"
          value={anthropicModel}
          onChange={(e) => setAnthropicModel(e.target.value)}
          placeholder="claude-sonnet-4-20250514"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </FormField>

      <FormField label="Modèle Ollama (vide = pas de substitution possible)">
        <input
          aria-label="Modèle Ollama"
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
          Autoriser la substitution selon les règles du Gateway ; le choix de déploiement reste prioritaire.
        </label>
      </FormField>

      <FormField label="Pipeline version">
        <select
          aria-label="Pipeline version"
          value={pipelineVersion}
          onChange={(e) => setPipelineVersion(e.target.value as PipelineVersion)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="V1">V1 — narration ancrée dans l’ADVE</option>
          <option value="V2">V2 — narration avec recherche documentaire (historique)</option>
          <option value="V3">V3 — dérivations stratégiques, tensions, diagnostic et recommandations</option>
        </select>
        <p className="mt-1 text-[10px] text-foreground-muted">
          Seul final-report sélectionne actuellement le pipeline du rapport d’intake.
          Il décrit les étapes, pas un modèle garanti ni un multiplicateur de coût mesuré.
          La consommation dépend des appels effectivement exécutés.
        </p>
      </FormField>

      <FormField label="Notes (audit)">
        <textarea
          aria-label="Notes (audit)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </FormField>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-error/30 bg-error/10 p-2 text-[11px] text-error">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="sm"
        >
          Annuler
        </Button>
        <Button
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
          className="ml-auto"
          size="sm"
        >
          {isPending ? "Enregistrement…" : "Enregistrer la politique"}
        </Button>
      </div>
    </div>
  );
}
