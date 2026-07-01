"use client";

/**
 * AmendPillarModal — Operator-facing UI for OPERATOR_AMEND_PILLAR (ADR-0023).
 *
 * Single voie d'édition intentionnelle des piliers ADVE. RTIS pillars are
 * intentionally NOT exposed here — they go through the
 * RecalculateRtisButton (which emits ENRICH_*_FROM_ADVE intents).
 *
 * Source of truth for the dropdown is `variable-bible` via the tRPC
 * `pillar.listEditableFields` procedure (NOT Zod introspection — see
 * ADR-0023 §I.2). Zod stays the runtime validator at the gateway.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Sparkles, AlertTriangle, Loader2, Send, Lock } from "lucide-react";

type AdveKey = "A" | "D" | "V" | "E";
type Mode = "PATCH_DIRECT" | "LLM_REPHRASE" | "STRATEGIC_REWRITE";

interface AmendPillarModalProps {
  open: boolean;
  onClose: () => void;
  strategyId: string;
  pillarKey: AdveKey;
  /** Pre-select a field (e.g. when launched from a per-field edit button). */
  initialField?: string;
  onApplied?: (result: { stalePillars: string[]; staleAssets: number; version: number }) => void;
}

export function AmendPillarModal({
  open,
  onClose,
  strategyId,
  pillarKey,
  initialField,
  onApplied,
}: AmendPillarModalProps) {
  const [field, setField] = useState<string | null>(initialField ?? null);
  const [mode, setMode] = useState<Mode>("PATCH_DIRECT");
  const [proposedValue, setProposedValue] = useState<string>("");
  const [rephrasePrompt, setRephrasePrompt] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [overrideLocked, setOverrideLocked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const editable = trpc.pillar.listEditableFields.useQuery(
    { strategyId, pillarKey },
    { enabled: open },
  );
  const previewMutation = trpc.pillar.previewAmend.useMutation();
  const amendMutation = trpc.pillar.amend.useMutation();

  const selectedFieldEntry = useMemo(
    () => editable.data?.fields.find((f) => f.field === field) ?? null,
    [editable.data, field],
  );

  const isLocked = editable.data?.validationStatus === "LOCKED";
  const reasonTooShort = mode === "STRATEGIC_REWRITE" && reason.trim().length < 20;
  const cannotApply =
    !field ||
    reasonTooShort ||
    (mode === "PATCH_DIRECT" && !proposedValue) ||
    (mode === "LLM_REPHRASE" && !proposedValue) ||
    amendMutation.isPending;

  function handlePreview() {
    if (!field || !rephrasePrompt) return;
    previewMutation.mutate(
      { strategyId, pillarKey, field, rephrasePrompt },
      {
        onSuccess: (out) => {
          if (typeof out.proposedValue === "string") setProposedValue(out.proposedValue);
          else if (out.proposedValue != null) setProposedValue(JSON.stringify(out.proposedValue, null, 2));
        },
      },
    );
  }

  function doApply() {
    if (!field) return;
    let parsedValue: unknown = proposedValue;
    // Try JSON parse if the field expects an object/array
    if (proposedValue.trim().startsWith("{") || proposedValue.trim().startsWith("[")) {
      try {
        parsedValue = JSON.parse(proposedValue);
      } catch {
        /* keep as string */
      }
    }
    amendMutation.mutate(
      {
        strategyId,
        pillarKey,
        field,
        mode,
        proposedValue: parsedValue,
        rephrasePrompt: mode === "LLM_REPHRASE" ? rephrasePrompt : undefined,
        reason,
        overrideLocked: isLocked ? overrideLocked : undefined,
        expectedVersion: editable.data?.version,
      },
      {
        onSuccess: (res) => {
          if (res.status === "OK") {
            const out = (res.output ?? {}) as {
              version?: number;
              stalePillars?: string[];
              staleAssets?: number;
            };
            onApplied?.({
              version: out.version ?? 0,
              stalePillars: out.stalePillars ?? [],
              staleAssets: out.staleAssets ?? 0,
            });
            onClose();
          }
        },
      },
    );
  }

  function handleApplyClick() {
    if (mode === "STRATEGIC_REWRITE") setConfirmOpen(true);
    else doApply();
  }

  return (
    <>
      <Modal open={open} onClose={onClose} size="xl" title={`Amender pilier ${pillarKey}`}>
        <div className="space-y-4">
          {/* Header status */}
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-surface-raised px-3 py-2 text-xs">
            <span className="font-semibold text-foreground-muted">v{editable.data?.version ?? "—"}</span>
            <span className="text-foreground-muted">·</span>
            <span
              className={
                isLocked
                  ? "flex items-center gap-1 text-amber-300"
                  : "text-emerald-300"
              }
            >
              {isLocked ? <Lock className="h-3 w-3" /> : null}
              {editable.data?.validationStatus ?? "DRAFT"}
            </span>
            {isLocked ? (
              <label className="ml-auto flex items-center gap-1 text-amber-300">
                <input
                  type="checkbox"
                  checked={overrideLocked}
                  onChange={(e) => setOverrideLocked(e.target.checked)}
                />
                <span>Override LOCKED (audit trail)</span>
              </label>
            ) : null}
          </div>

          {/* Field selector */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-foreground-secondary">Variable à amender</label>
            <select
              className="w-full rounded-lg border border-white/10 bg-background-overlay px-3 py-2 text-sm"
              value={field ?? ""}
              onChange={(e) => setField(e.target.value || null)}
              disabled={editable.isLoading}
            >
              <option value="">Choisir une variable…</option>
              {(editable.data?.fields ?? []).map((f) => (
                <option key={f.field} value={f.field}>
                  {f.field} ({f.mode})
                </option>
              ))}
            </select>
            {selectedFieldEntry?.spec.description ? (
              <p className="text-[11px] italic text-foreground-muted">
                {selectedFieldEntry.spec.description}
              </p>
            ) : null}
          </div>

          {/* Mode tabs */}
          {field ? (
            <div className="flex gap-1 rounded-lg border border-white/10 bg-background-overlay p-1">
              {(["PATCH_DIRECT", "LLM_REPHRASE", "STRATEGIC_REWRITE"] as const).map((m) => {
                const recommended = selectedFieldEntry?.mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${
                      mode === m ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    {m.replace("_", " ").toLowerCase()}
                    {recommended ? <span className="ml-1 text-[9px] text-emerald-400">(spec)</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Current value */}
          {field ? (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground-secondary">Valeur actuelle</label>
              <pre className="max-h-32 overflow-auto rounded-lg border border-white/5 bg-surface-raised px-3 py-2 text-xs text-foreground-muted">
                {selectedFieldEntry?.currentValue == null
                  ? "(vide)"
                  : typeof selectedFieldEntry.currentValue === "string"
                    ? selectedFieldEntry.currentValue
                    : JSON.stringify(selectedFieldEntry.currentValue, null, 2)}
              </pre>
            </div>
          ) : null}

          {/* LLM_REPHRASE prompt */}
          {field && mode === "LLM_REPHRASE" ? (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground-secondary">
                Décris ton intention en langage naturel
              </label>
              <textarea
                className="w-full rounded-lg border border-white/10 bg-background-overlay px-3 py-2 text-sm"
                rows={3}
                value={rephrasePrompt}
                onChange={(e) => setRephrasePrompt(e.target.value)}
                placeholder="Ex: Renforcer le ton premium, supprimer toute référence au low-cost…"
              />
              <button
                type="button"
                onClick={handlePreview}
                disabled={!rephrasePrompt || previewMutation.isPending}
                className="flex items-center gap-1 rounded-md bg-accent/20 px-3 py-1 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Prévisualiser
              </button>
            </div>
          ) : null}

          {/* Proposed value */}
          {field ? (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground-secondary">
                Valeur proposée
                {selectedFieldEntry?.spec.format ? (
                  <span className="ml-2 text-[10px] text-foreground-muted">
                    {selectedFieldEntry.spec.format}
                  </span>
                ) : null}
              </label>
              <textarea
                className="w-full rounded-lg border border-white/10 bg-background-overlay px-3 py-2 text-sm font-mono"
                rows={5}
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder={selectedFieldEntry?.spec.examples?.[0] ?? ""}
              />
              {selectedFieldEntry?.spec.maxLength ? (
                <p className="text-[10px] text-foreground-muted">
                  {proposedValue.length} / {selectedFieldEntry.spec.maxLength} car.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Reason */}
          {field ? (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground-secondary">
                Raison
                {mode === "STRATEGIC_REWRITE" ? (
                  <span className="ml-2 text-[10px] text-amber-400">(≥20 caractères)</span>
                ) : null}
              </label>
              <textarea
                className="w-full rounded-lg border border-white/10 bg-background-overlay px-3 py-2 text-sm"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Pourquoi ce changement maintenant ?"
              />
            </div>
          ) : null}

          {/* STRATEGIC_REWRITE warning */}
          {mode === "STRATEGIC_REWRITE" ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <div>
                Mode destructif. Tous les BrandAssets ACTIVE liés à ce pilier seront marqués <code>staleAt</code> pour
                régénération suggérée. Les piliers RTIS dépendants passeront <code>staleAt=now()</code>.
              </div>
            </div>
          ) : null}

          {/* Backend errors */}
          {amendMutation.data && amendMutation.data.status !== "OK" ? (
            <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
              {amendMutation.data.summary}
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApplyClick}
              disabled={cannotApply}
              className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {amendMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Appliquer
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          doApply();
        }}
        title="Confirmer le STRATEGIC_REWRITE"
        message="Cette action est destructive. Les BrandAssets ACTIVE liés seront marqués stale et les piliers RTIS dépendants seront invalidés. Confirmer ?"
        confirmLabel="Oui, amender"
        variant="danger"
      />
    </>
  );
}
