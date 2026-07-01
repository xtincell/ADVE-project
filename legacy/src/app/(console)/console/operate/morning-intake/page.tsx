/**
 * /console/operate/morning-intake — Phase 18-A1-δ (ADR-0062).
 *
 * Middle portal validation pour le Morning Brief Batch. Workflow :
 *
 *   1. ZONE 1 INPUT : opérateur paste blob (mails + slacks + whatsapps)
 *      OU clique "Saisir manuellement" pour créer source/draft sans LLM.
 *
 *   2. ZONE 2 REVIEW (apparait après Analyse) : 2 colonnes side-by-side.
 *      Gauche = source brute. Droite = draft extrait éditable champ par champ
 *      (classification, nodePath, summary, accepter/rejeter).
 *
 *   3. ZONE 3 ACTION : compteurs + bouton "Confirmer batch" → matérialisation
 *      via mestor.emitIntent(MORNING_BRIEF_BATCH_CONFIRM).
 *
 * Manual-first parity (ADR-0060) : aucune fonction LLM-only. Toutes les actions
 * sont saisissables manuellement via les Intent kinds OPERATOR_CREATE_INGESTED_SOURCE
 * et OPERATOR_CREATE_BRIEF_DRAFT.
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Inbox, Sparkles, CheckCircle2, XCircle, RefreshCw, Edit3, Send } from "lucide-react";

const CLASSIFICATION_COLORS: Record<string, string> = {
  NEW_BRIEF: "bg-emerald-500/15 text-emerald-300",
  UPDATE_OF_BRIEF: "bg-blue-500/15 text-blue-300",
  NON_BRIEF: "bg-zinc-500/15 text-zinc-300",
  OPS_ACTION: "bg-amber-500/15 text-amber-300",
  AMBIGUOUS: "bg-error/15 text-error",
};
const CLASSIFICATION_LABELS: Record<string, string> = {
  NEW_BRIEF: "🟢 Nouveau brief",
  UPDATE_OF_BRIEF: "🔵 Update existant",
  NON_BRIEF: "⚪ Non-brief (FYI)",
  OPS_ACTION: "🟡 Action ops",
  AMBIGUOUS: "🔴 Ambigu",
};

export default function MorningIntakePage() {
  const [rawInput, setRawInput] = useState("");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: operator } = trpc.operator.getOwn.useQuery();

  const utils = trpc.useUtils();
  const previewMutation = trpc.morningBatch.preview.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        setActiveBatchId(res.batchId);
        utils.morningBatch.getBatch.invalidate({ batchId: res.batchId });
      }
    },
    onError: (err) => setError(err.message),
  });

  const confirmMutation = trpc.morningBatch.confirm.useMutation({
    onSuccess: () => {
      utils.morningBatch.invalidate();
      utils.campaignDeliverable.invalidate();
      utils.brandNode.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  const onAnalyze = async () => {
    setError(null);
    if (!operator) return setError("Operator non chargé");
    if (!rawInput.trim()) return setError("Colle d'abord un blob mail/slack/whatsapp");
    await previewMutation.mutateAsync({
      strategyId: `audit:${operator.id}`,
      operatorId: operator.id,
      rawInput,
    });
  };

  if (!operator) return <div className="p-6 text-sm text-foreground-secondary">Loading…</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Inbox className="h-6 w-6" /> Morning Brief Batch
        </h1>
        <p className="text-sm text-foreground-secondary">
          Cadence quotidienne : paste les mails / slacks / whatsapps reçus → extraction → validation humaine → matérialisation Campaign + Brief.
        </p>
        <p className="mt-1 text-xs text-foreground-secondary">
          Operator : <strong>{operator.name}</strong>. Manual-first parity (ADR-0060) : tout est saisissable manuellement sans LLM.
        </p>
      </header>

      {error && <div className="rounded bg-error/15 p-3 text-sm text-error">{error}</div>}

      {/* ZONE 1 — INPUT */}
      {!activeBatchId && (
        <section className="rounded border border-zinc-700">
          <header className="border-b border-zinc-700 px-4 py-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">1. Input — paste tes mails/slacks/whatsapps du matin</span>
          </header>
          <div className="flex flex-col gap-3 p-4">
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={`Exemple — paste plusieurs blocks séparés par --- :

From: Mariam Kone <mkone@frieslandcampina.com>
Sujet: Saison des pluies BR EVAP

Bonjour Alex, pour la saison des pluies on a besoin d'OOH 12m² + Posters 60x40 sur Bonnet Rouge EVAP en Côte d'Ivoire. Deadline 15 juin.

---

From: Junior KOFFI <junior@groupe-bel.com>
Sujet: BRIEF ACTIVATION RAMADAN VQR

Spot radio validé. On attend le poster final + plan media.

---

[Slack #cadyst-farming]
Vanelle: Brief ROBUSTE prêt, voir thread. Urgent — réunion lundi.`}
              rows={12}
              className="w-full rounded border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={onAnalyze}
                disabled={previewMutation.isPending || !rawInput.trim()}
                className="inline-flex items-center gap-2 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {previewMutation.isPending ? "Analyse…" : "Analyser le batch"}
              </button>
              <button
                onClick={() => alert("Saisie manuelle MVP — utilise tRPC morningBatch.createSourceManual + createDraftManual directement (UI form dédiée Phase 18-A1-δ-bis).")}
                className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
              >
                Saisir manuellement (sans LLM)
              </button>
            </div>
            <p className="text-xs text-foreground-secondary">
              💡 Astuce : sépare tes blocks par <code>---</code> pour forcer la détection multi-source. Le splitter détecte aussi auto les headers <code>From:/Subject:/Sujet:</code> + threads Slack.
            </p>
          </div>
        </section>
      )}

      {/* ZONE 2 + 3 — REVIEW + CONFIRM */}
      {activeBatchId && (
        <BatchReviewView
          batchId={activeBatchId}
          operatorId={operator.id}
          strategyId={`audit:${operator.id}`}
          onConfirmed={() => {
            setActiveBatchId(null);
            setRawInput("");
          }}
          onCancel={() => setActiveBatchId(null)}
        />
      )}

      {/* Historique batches */}
      <section className="rounded border border-zinc-800">
        <header className="border-b border-zinc-800 px-4 py-2 text-sm font-medium text-foreground-secondary">
          Historique batches récents
        </header>
        <BatchesHistoryList operatorId={operator.id} />
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// BatchReviewView — middle portal validation
// ──────────────────────────────────────────────────────────────────────

function BatchReviewView({
  batchId,
  operatorId,
  strategyId,
  onConfirmed,
  onCancel,
}: {
  batchId: string;
  operatorId: string;
  strategyId: string;
  onConfirmed: () => void;
  onCancel: () => void;
}) {
  const { data: batch } = trpc.morningBatch.getBatch.useQuery({ batchId });
  const utils = trpc.useUtils();
  const confirmMutation = trpc.morningBatch.confirm.useMutation({
    onSuccess: () => {
      utils.morningBatch.invalidate();
      utils.campaign.list?.invalidate?.();
      onConfirmed();
    },
  });

  if (!batch) return <div className="text-sm text-foreground-secondary">Loading batch {batchId}…</div>;

  // Type loose pour drafts — le typing exact dépend du return shape getBatch (include source).
  // Phase 18-N future : remplacer par output schema partagé router/service.
  type DraftWithSource = NonNullable<typeof batch.drafts>[number];
  const drafts: DraftWithSource[] = batch.drafts ?? [];
  const counts = {
    pending: drafts.filter((d: DraftWithSource) => d.state === "PENDING_REVIEW").length,
    accepted: drafts.filter((d: DraftWithSource) => d.state === "ACCEPTED").length,
    rejected: drafts.filter((d: DraftWithSource) => d.state === "REJECTED").length,
    edited: drafts.filter((d: DraftWithSource) => d.state === "EDITED").length,
  };
  const acceptableIds = drafts
    .filter((d: DraftWithSource) => d.state === "ACCEPTED" || d.state === "EDITED")
    .map((d: DraftWithSource) => d.id);

  return (
    <>
      <section className="rounded border border-zinc-700">
        <header className="border-b border-zinc-700 px-4 py-2 flex items-center justify-between">
          <span className="font-medium">2. Review — {drafts.length} drafts extraits</span>
          <span className="text-xs text-foreground-secondary">batch {batch.id.slice(0, 8)}…</span>
        </header>
        <div className="divide-y divide-zinc-800">
          {drafts.map((draft: DraftWithSource) => (
            <DraftReviewRow
              key={draft.id}
              draft={draft}
              operatorId={operatorId}
              strategyId={strategyId}
            />
          ))}
        </div>
      </section>

      <section className="rounded border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <strong>{counts.pending}</strong> pending · <strong>{counts.accepted}</strong> accepted ·{" "}
            <strong>{counts.edited}</strong> edited · <strong>{counts.rejected}</strong> rejected
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
            >
              Discard batch
            </button>
            <button
              onClick={() =>
                confirmMutation.mutate({
                  strategyId,
                  operatorId,
                  batchId,
                  draftIds: acceptableIds,
                })
              }
              disabled={confirmMutation.isPending || acceptableIds.length === 0}
              className="inline-flex items-center gap-2 rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {confirmMutation.isPending
                ? "Matérialisation…"
                : `Confirmer batch (${acceptableIds.length} drafts)`}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// DraftReviewRow — 1 row source ↔ draft éditable
// ──────────────────────────────────────────────────────────────────────

interface DraftRowProps {
  draft: {
    id: string;
    classification: string;
    classificationReason: string | null;
    resolvedNodeId: string | null;
    resolvedNodePath: string[];
    resolvedCampaignId: string | null;
    resolvedCampaignName: string | null;
    payload: unknown;
    confidence: number;
    state: string;
    source: {
      id: string;
      kind: string;
      sender: string | null;
      subject: string | null;
      rawSnippet: string;
      sourceUrl: string | null;
    };
  };
  operatorId: string;
  strategyId: string;
}

function DraftReviewRow({ draft, operatorId, strategyId }: DraftRowProps) {
  const payload = (draft.payload ?? {}) as {
    title?: string;
    summary?: string;
    briefType?: string;
    urgency?: string;
    deliverables?: string[];
  };
  const [editingTitle, setEditingTitle] = useState(payload.title ?? "");
  const [editingSummary, setEditingSummary] = useState(payload.summary ?? "");
  const [editingClass, setEditingClass] = useState(draft.classification);

  const utils = trpc.useUtils();
  const updateMutation = trpc.morningBatch.updateDraft.useMutation({
    onSuccess: () => utils.morningBatch.getBatch.invalidate(),
  });
  const reanalyzeMutation = trpc.morningBatch.reanalyze.useMutation({
    onSuccess: () => utils.morningBatch.getBatch.invalidate(),
  });

  const updateState = (state: "ACCEPTED" | "REJECTED" | "EDITED") =>
    updateMutation.mutate({
      strategyId,
      operatorId,
      draftId: draft.id,
      classification: editingClass as "NEW_BRIEF" | "UPDATE_OF_BRIEF" | "NON_BRIEF" | "OPS_ACTION" | "AMBIGUOUS",
      payload: {
        ...payload,
        title: editingTitle,
        summary: editingSummary,
      },
      state,
    });

  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {/* Source brute (gauche) */}
      <div className="rounded border border-zinc-800 bg-zinc-900/30 p-3 text-xs">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase">{draft.source.kind}</span>
          {draft.source.sender && <span className="text-foreground-secondary">De: {draft.source.sender}</span>}
        </div>
        {draft.source.subject && <div className="mb-1 font-medium">{draft.source.subject}</div>}
        <div className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-foreground-secondary">
          {draft.source.rawSnippet.slice(0, 800)}
          {draft.source.rawSnippet.length > 800 && "…"}
        </div>
        {draft.source.sourceUrl && (
          <a
            href={draft.source.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-accent hover:underline"
          >
            Voir source originale →
          </a>
        )}
      </div>

      {/* Draft extrait éditable (droite) */}
      <div className="flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-900/30 p-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={editingClass}
            onChange={(e) => setEditingClass(e.target.value)}
            className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${CLASSIFICATION_COLORS[editingClass] ?? ""}`}
          >
            {Object.entries(CLASSIFICATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="text-[10px] text-foreground-secondary">
            confidence: {(draft.confidence * 100).toFixed(0)}%
          </span>
          {draft.classificationReason && (
            <span className="text-[10px] italic text-foreground-secondary" title={draft.classificationReason}>
              · raison: {draft.classificationReason.slice(0, 30)}…
            </span>
          )}
        </div>

        {draft.resolvedNodePath.length > 0 && (
          <div className="text-[10px] text-foreground-secondary">
            🌳 Nœud résolu : {draft.resolvedNodePath.join(" → ")}
          </div>
        )}
        {draft.resolvedCampaignName && (
          <div className="text-[10px] text-blue-300">
            🔁 Match campaign : {draft.resolvedCampaignName}
          </div>
        )}

        <input
          type="text"
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          placeholder="Titre"
        />
        <textarea
          value={editingSummary}
          onChange={(e) => setEditingSummary(e.target.value)}
          rows={2}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          placeholder="Résumé"
        />
        {payload.deliverables && payload.deliverables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {payload.deliverables.map((d, i) => (
              <span key={i} className="rounded bg-zinc-800 px-1 py-0.5 text-[10px]">{d}</span>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center gap-1 flex-wrap">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase">
            state: {draft.state}
          </span>
          <button
            onClick={() => updateState("ACCEPTED")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/30"
          >
            <CheckCircle2 className="h-3 w-3" /> Accept
          </button>
          <button
            onClick={() => updateState("REJECTED")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded bg-error/20 px-2 py-0.5 text-[10px] text-error hover:bg-error/30"
          >
            <XCircle className="h-3 w-3" /> Reject
          </button>
          <button
            onClick={() => updateState("EDITED")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/30"
          >
            <Edit3 className="h-3 w-3" /> Save edits
          </button>
          <button
            onClick={() =>
              reanalyzeMutation.mutate({
                strategyId,
                operatorId,
                draftId: draft.id,
              })
            }
            disabled={reanalyzeMutation.isPending}
            className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 hover:bg-blue-500/30"
          >
            <RefreshCw className="h-3 w-3" /> Re-analyse
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// BatchesHistoryList
// ──────────────────────────────────────────────────────────────────────

function BatchesHistoryList({ operatorId }: { operatorId: string }) {
  const { data: batches } = trpc.morningBatch.listBatches.useQuery({ operatorId, limit: 10 });
  if (!batches || batches.length === 0) {
    return (
      <div className="p-4 text-sm text-foreground-secondary">
        Aucun batch précédent.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-800">
      {batches.map((b) => (
        <li key={b.id} className="flex items-center justify-between p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase">{b.state}</span>
            <span className="text-foreground-secondary">
              {new Date(b.startedAt).toLocaleString("fr-FR")}
            </span>
          </div>
          <span className="text-xs text-foreground-secondary">
            {b.sourceCount} sources · {b.briefCount} drafts · {b._count.drafts} en DB
          </span>
        </li>
      ))}
    </ul>
  );
}
