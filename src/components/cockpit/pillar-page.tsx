"use client";

/**
 * PillarPage — Composant partagé pour les pages pilier du Cockpit
 *
 * Utilise le design system (field-renderers.tsx) pour le rendu automatique.
 * Le type de chaque champ (string/array/object/number) dicte le composant visuel.
 * Plus d'improvisation — contrat type → rendu.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  AutoField, FocusModal, isInlineField, InlineBadge, getFieldLabel,
} from "./field-renderers";
import {
  RefreshCw, AlertCircle, CheckCircle, Sparkles, Loader2,
  ThumbsUp, ThumbsDown, ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ── Pillar config ─────────────────────────────────────────────────────

const PILLAR_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  pillarKey: PillarKey;
  type: "adve" | "rtis";
  accent: string;
}> = {
  identity:     { title: "Identite",                subtitle: "Qui est votre marque ? Son ADN, ses valeurs, sa vision.", pillarKey: "a", type: "adve", accent: "text-violet-400" },
  positioning:  { title: "Positionnement & Design", subtitle: "Comment votre marque se distingue sur le marche.",       pillarKey: "d", type: "adve", accent: "text-blue-400" },
  offer:        { title: "Offre & Pricing",         subtitle: "Votre proposition de valeur et votre modele economique.",pillarKey: "v", type: "adve", accent: "text-emerald-400" },
  engagement:   { title: "Experience & Engagement",  subtitle: "Comment vous creez la devotion autour de votre marque.", pillarKey: "e", type: "adve", accent: "text-amber-400" },
  diagnostic:   { title: "Diagnostic",               subtitle: "Analyse des risques et vulnerabilites.",                 pillarKey: "r", type: "rtis", accent: "text-red-400" },
  market:       { title: "Realite Marche",           subtitle: "Ce que le marche dit de votre marque.",                  pillarKey: "t", type: "rtis", accent: "text-sky-400" },
  potential:    { title: "Potentiel",                 subtitle: "Tout ce que votre marque peut faire.",                   pillarKey: "i", type: "rtis", accent: "text-orange-400" },
  roadmap:      { title: "Strategie",                subtitle: "Votre plan d'action vers le superfan.",                  pillarKey: "s", type: "rtis", accent: "text-pink-400" },
};

// ── RecoValuePreview — compact preview of proposed/current value ──────

function RecoValuePreview({ value }: { value: unknown }) {
  if (value == null || value === "") return <span className="text-[10px] text-foreground-muted/50 italic">vide</span>;
  if (typeof value === "string") return <p className="text-[11px] text-white/80 line-clamp-3">{value}</p>;
  if (typeof value === "number") return <span className="text-[11px] text-white font-medium">{value.toLocaleString()}</span>;
  if (typeof value === "boolean") return <span className={`text-[11px] ${value ? "text-emerald-300" : "text-red-300"}`}>{value ? "Oui" : "Non"}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[10px] text-foreground-muted/50 italic">vide</span>;
    if (typeof value[0] === "string") {
      return (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).slice(0, 5).map((v, i) => (
            <span key={i} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70">{v}</span>
          ))}
          {value.length > 5 ? <span className="text-[10px] text-foreground-muted">+{value.length - 5}</span> : null}
        </div>
      );
    }
    // Array of objects — show count + first item preview
    const first = value[0] as Record<string, unknown>;
    const nameKey = ["name", "nom", "action", "title", "axe", "phase", "risk", "activation"].find(k => typeof first[k] === "string");
    return (
      <div className="text-[11px] text-white/70">
        <span className="text-foreground-muted">{value.length} elements</span>
        {nameKey ? <span className="ml-1 text-white/50">({(value as Array<Record<string, unknown>>).slice(0, 3).map(v => String(v[nameKey])).join(", ")}{value.length > 3 ? "..." : ""})</span> : null}
      </div>
    );
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null && v !== "");
    return (
      <div className="space-y-0.5">
        {entries.slice(0, 4).map(([k, v]) => (
          <div key={k} className="flex gap-1.5 text-[10px]">
            <span className="text-foreground-muted shrink-0">{getFieldLabel(k)}:</span>
            <span className="text-white/70 truncate">{typeof v === "string" ? v.slice(0, 80) : typeof v === "number" ? v.toLocaleString() : Array.isArray(v) ? `${v.length} elements` : "..."}</span>
          </div>
        ))}
        {entries.length > 4 ? <p className="text-[9px] text-foreground-muted/50">+{entries.length - 4} champs</p> : null}
      </div>
    );
  }
  return <span className="text-[11px] text-white/70">{String(value)}</span>;
}

// ── Component ─────────────────────────────────────────────────────────

interface PillarPageProps { pageKey: keyof typeof PILLAR_CONFIG }

export function PillarPage({ pageKey }: PillarPageProps) {
  const config = PILLAR_CONFIG[pageKey]!;
  const strategyId = useCurrentStrategyId();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);
  const [focusedItem, setFocusedItem] = useState<Record<string, unknown> | null>(null);

  const isAdve = config.type === "adve";
  const adveKey = config.pillarKey.toUpperCase() as "A" | "D" | "V" | "E";
  const upperKey = config.pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";

  const pillarQuery = trpc.pillar.get.useQuery(
    { strategyId: strategyId ?? "", key: upperKey },
    { enabled: !!strategyId },
  );

  const assessQuery = trpc.pillar.assess.useQuery(
    { strategyId: strategyId ?? "", key: upperKey },
    { enabled: !!strategyId },
  );

  // ── Notoria recommendations (replaces pillar.getRecos) ──
  const recosQuery = trpc.notoria.getRecosByPillar.useQuery(
    { strategyId: strategyId ?? "", pillarKey: upperKey, status: "PENDING" },
    { enabled: !!strategyId && isAdve },
  );

  // RTIS pages: aggregate ADVE pending reco counts via Notoria
  const pendingCountsQuery = trpc.notoria.getPendingCounts.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId && !isAdve },
  );

  const autoFillMutation = trpc.pillar.autoFill.useMutation({ onSuccess: () => { pillarQuery.refetch(); recosQuery.refetch(); } });
  const actualizeMutation = trpc.pillar.actualize.useMutation({ onSuccess: () => pillarQuery.refetch() });
  const vaultEnrichMutation = trpc.pillar.enrichFromVault.useMutation({ onSuccess: () => { pillarQuery.refetch(); recosQuery.refetch(); } });
  const acceptRecosMutation = trpc.notoria.acceptRecos.useMutation({
    onSuccess: () => {
      pillarQuery.refetch();
      recosQuery.refetch();
      setEnrichResult({ type: "success", message: "Recommandations acceptees." });
    },
    onError: (err: any) => {
      const raw = err?.data?.message ?? err?.message ?? "Erreur lors de l'acceptation";
      const isForbidden = (err?.data?.code === "FORBIDDEN") || String(raw).toLowerCase().includes("operateur") || String(raw).toLowerCase().includes("forbidden");
      setEnrichResult({ type: "error", message: isForbidden ? "Action reservee aux operateurs." : String(raw) });
    },
  });
  const applyRecosMutation = trpc.notoria.applyRecos.useMutation({
    onSuccess: () => {
      pillarQuery.refetch();
      recosQuery.refetch();
      setEnrichResult({ type: "success", message: "Recommandations appliquees sur le pilier." });
    },
    onError: (err: any) => { setEnrichResult({ type: "error", message: err?.message ?? "Erreur lors de l'application" }); },
  });
  const rejectRecosMutation = trpc.notoria.rejectRecos.useMutation({
    onSuccess: () => recosQuery.refetch(),
    onError: (err: any) => { setEnrichResult({ type: "error", message: err?.message ?? "Erreur lors du rejet" }); },
  });
  const [selectedRecos, setSelectedRecos] = useState<Set<string>>(new Set());

  if (!strategyId) return <SkeletonPage />;
  if (pillarQuery.isLoading) return <SkeletonPage />;

  const pillar = pillarQuery.data?.pillar;
  const content = (pillar?.content ?? {}) as Record<string, unknown>;
  const isFilled = (v: unknown) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);

  // Schema keys = source of truth. Filter dot-notation artifacts.
  const schemaKey = config.pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[schemaKey];
  const schemaKeys = schema ? Object.keys((schema as { shape?: Record<string, unknown> }).shape ?? {}) : [];
  const contentKeys = Object.keys(content).filter(k => !k.includes("."));
  const extraKeys = contentKeys.filter(k => !schemaKeys.includes(k) && isFilled(content[k]));
  const allKeys = [...schemaKeys, ...extraKeys];

  // Maturity-based scoring (never > 100%)
  const assess = assessQuery.data;
  const enrichedPct = assess?.enrichedPct ?? 0;   // Suffisant
  const completePct = assess?.completionPct ?? 0;  // Complet
  const rtConsolidated = assess?.rtConsolidated ?? false;
  const validationPct = completePct; // backward compat for progress bar

  // Split keys by category
  const inlineKeys = allKeys.filter(k => isInlineField(k));
  const fieldKeys = allKeys.filter(k => !isInlineField(k));

  // ── Handlers ────────────────────────────────────────────────────

  const handleRegenerate = async () => {
    if (!strategyId) return;
    setIsRegenerating(true);
    setEnrichResult(null);
    try {
      let vaultWorked = false;
      try {
        const vr = await vaultEnrichMutation.mutateAsync({ strategyId, pillarKey: config.pillarKey });
        const recoCount = vr.recommendations?.length ?? 0;
        const vaultSize = vr.vaultSize ?? 0;
        if (vaultSize === 0) {
          setEnrichResult({ type: "warning", message: "Vault vide — ajoutez des sources dans l'onglet Sources." });
        } else if (recoCount > 0) {
          vaultWorked = true;
          setEnrichResult({ type: "success", message: `${recoCount} recommandation(s) depuis ${vaultSize} source(s).` });
        } else {
          setEnrichResult({ type: "warning", message: `${vaultSize} source(s) scannee(s) — aucune recommandation.` });
        }
        if (vr.error) setEnrichResult({ type: "error", message: vr.error });
      } catch (err) { console.warn("[enrichir] vault failed:", err); }

      if (!vaultWorked) {
        try {
          if (isAdve) {
            const r = await autoFillMutation.mutateAsync({ strategyId, pillarKey: config.pillarKey });
            const filled = (r as unknown as Record<string, unknown>)?.filled;
            if (Array.isArray(filled) && filled.length > 0) setEnrichResult({ type: "success", message: `${filled.length} champ(s) rempli(s).` });
            else setEnrichResult(prev => prev ?? { type: "warning", message: "Tous les champs sont remplis ou necessitent une saisie manuelle." });
          } else {
            await actualizeMutation.mutateAsync({ strategyId, key: upperKey });
            setEnrichResult({ type: "success", message: "Protocole execute. Pilier actualise." });
          }
        } catch (err) { setEnrichResult({ type: "error", message: `${err instanceof Error ? err.message : String(err)}` }); }
      }
    } finally { setIsRegenerating(false); }
  };

  // ── Recos data ──────────────────────────────────────────────────

  // Notoria recos: each reco is a Recommendation entity with id, status, etc.
  const pendingRecos = (recosQuery.data ?? []) as Array<Record<string, unknown> & { id: string; status: string }>;

  // RTIS pages: pending counts from Notoria
  const pendingCounts = pendingCountsQuery?.data ?? {};
  const totalPendingADVE = (pendingCounts["a"] ?? 0) + (pendingCounts["d"] ?? 0) + (pendingCounts["v"] ?? 0) + (pendingCounts["e"] ?? 0);

  // Map ADVE pillar key -> page route (reverse of PILLAR_CONFIG)
  const ADVE_PAGE_FOR_KEY: Record<string, string> = {};
  Object.entries(PILLAR_CONFIG).forEach(([page, cfg]) => {
    if (cfg.type === "adve") ADVE_PAGE_FOR_KEY[cfg.pillarKey.toUpperCase()] = page;
  });

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-4 md:p-6">
      {/* Focus modal */}
      {focusedItem ? <FocusModal item={focusedItem} onClose={() => setFocusedItem(null)} /> : null}

      {/* ── Header — 3-level scoring ─────────────────────────────── */}
      <div className="rounded-lg border border-white/5 bg-surface-raised px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className={`text-lg font-bold ${config.accent} truncate`}>{config.title}</h1>
            {pillar?.validationStatus && pillar.validationStatus !== "DRAFT" ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                pillar.validationStatus === "VALIDATED" ? "bg-emerald-500/15 text-emerald-300" :
                pillar.validationStatus === "AI_PROPOSED" ? "bg-amber-500/15 text-amber-300" :
                "bg-white/10 text-foreground-muted"
              }`}>{pillar.validationStatus === "VALIDATED" ? "Valide" : pillar.validationStatus === "AI_PROPOSED" ? "IA" : pillar.validationStatus}</span>
            ) : null}
          </div>
          <button onClick={handleRegenerate} disabled={isRegenerating}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isAdve ? "bg-violet-600/20 text-violet-300 hover:bg-violet-600/30" : "bg-sky-600/20 text-sky-300 hover:bg-sky-600/30"
            } disabled:opacity-50`}>
            {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Enrichir
          </button>
        </div>
        {/* 3-level scoring bar */}
        <div className="mt-2 flex items-center gap-3">
          {/* Suffisant (ENRICHED) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold ${enrichedPct >= 80 ? "text-emerald-400" : "text-foreground-muted"}`}>Suffisant</span>
            <div className="h-1.5 w-16 rounded-full bg-white/5">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(enrichedPct, 100)}%`, backgroundColor: enrichedPct >= 80 ? "#34d399" : "#a78bfa" }} />
            </div>
            <span className={`text-[10px] ${enrichedPct >= 80 ? "text-emerald-400" : "text-foreground-muted"}`}>{enrichedPct}%</span>
          </div>
          {/* Complet (COMPLETE) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold ${completePct >= 100 ? "text-emerald-400" : "text-foreground-muted"}`}>Complet</span>
            <div className="h-1.5 w-16 rounded-full bg-white/5">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(completePct, 100)}%`, backgroundColor: completePct >= 100 ? "#34d399" : "#a78bfa" }} />
            </div>
            <span className={`text-[10px] ${completePct >= 100 ? "text-emerald-400" : "text-foreground-muted"}`}>{completePct}%</span>
          </div>
          {/* R+T Consolidé (golden badge) */}
          {isAdve && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              rtConsolidated
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : "bg-white/5 text-foreground-muted"
            }`}>
              R+T {rtConsolidated ? "✓" : "—"}
            </span>
          )}
          {/* Stage badge */}
          {assess?.currentStage && (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
              assess.currentStage === "COMPLETE" ? "bg-emerald-500/15 text-emerald-300" :
              assess.currentStage === "ENRICHED" ? "bg-blue-500/15 text-blue-300" :
              assess.currentStage === "INTAKE" ? "bg-amber-500/15 text-amber-300" :
              "bg-white/5 text-foreground-muted"
            }`}>{assess.currentStage}</span>
          )}
        </div>
      </div>

      {/* ── Feedback toast ─────────────────────────────────────────── */}
      {enrichResult ? (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs ${
          enrichResult.type === "success" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" :
          enrichResult.type === "warning" ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" :
          "bg-red-500/10 text-red-300 border border-red-500/20"
        }`}>
          {enrichResult.type === "success" ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
          <span>{enrichResult.message}</span>
          <button onClick={() => setEnrichResult(null)} className="ml-auto text-foreground-muted hover:text-white">✕</button>
        </div>
      ) : null}

      {/* ── Recommendation review panel ────────────────────────────── */}
      {isAdve && pendingRecos.length > 0 ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">{pendingRecos.length} recommandation(s)</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                const ids = pendingRecos.map(r => r.id);
                if (ids.length === 0) return;
                acceptRecosMutation.mutate({ strategyId: strategyId!, recoIds: ids });
                setSelectedRecos(new Set());
              }} disabled={acceptRecosMutation.isPending || pendingRecos.length === 0}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40">
                <CheckCircle className="h-3 w-3" /> Tout accepter
              </button>
              <button onClick={() => {
                const ids = Array.from(selectedRecos);
                if (ids.length === 0) return;
                acceptRecosMutation.mutate({ strategyId: strategyId!, recoIds: ids });
                setSelectedRecos(new Set());
              }} disabled={selectedRecos.size === 0 || acceptRecosMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-600/10 text-emerald-300/70 hover:bg-emerald-600/20 disabled:opacity-40">
                <ThumbsUp className="h-3 w-3" /> Selection ({selectedRecos.size})
              </button>
              <button onClick={() => {
                const ids = pendingRecos.map(r => r.id);
                if (ids.length === 0) return;
                rejectRecosMutation.mutate({ strategyId: strategyId!, recoIds: ids });
              }} disabled={rejectRecosMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-red-600/20 text-red-300 hover:bg-red-600/30 disabled:opacity-40">
                <ThumbsDown className="h-3 w-3" /> Rejeter
              </button>
              <Link href="/cockpit/brand/notoria" className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 ml-auto">
                <Sparkles className="h-3 w-3" /> Notoria
              </Link>
            </div>
          </div>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {pendingRecos.map((reco) => {
              const recoId = reco.id;
              const isSelected = selectedRecos.has(recoId);
              const op = String(reco.operation ?? "SET");
              const opLabel = op === "SET" ? "Remplacer" : op === "ADD" ? "Ajouter" : op === "MODIFY" ? "Modifier" : op === "REMOVE" ? "Supprimer" : op === "EXTEND" ? "Enrichir" : op;
              const opColor = op === "SET" ? "bg-orange-500/15 text-orange-300" :
                              op === "ADD" ? "bg-emerald-500/15 text-emerald-300" :
                              op === "MODIFY" ? "bg-blue-500/15 text-blue-300" :
                              op === "REMOVE" ? "bg-red-500/15 text-red-300" :
                              op === "EXTEND" ? "bg-violet-500/15 text-violet-300" :
                              "bg-white/10 text-foreground-muted";
              const fieldName = String(reco.targetField ?? reco.field ?? "");
              const currentValue = content[fieldName];
              const hasProposed = reco.proposedValue != null && reco.proposedValue !== "";

              return (
                <div key={recoId} onClick={() => { const s = new Set(selectedRecos); if (isSelected) s.delete(recoId); else s.add(recoId); setSelectedRecos(s); }}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${isSelected ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/5 bg-white/[0.02] hover:bg-white/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Operation badge + field name + impact */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${opColor}`}>{opLabel}</span>
                        <span className="text-xs font-medium text-white">{getFieldLabel(fieldName)}</span>
                        {reco.impact ? <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${reco.impact === "HIGH" ? "bg-red-500/15 text-red-300" : reco.impact === "MEDIUM" ? "bg-amber-500/15 text-amber-300" : "bg-white/10 text-foreground-muted"}`}>{String(reco.impact)}</span> : null}
                      </div>
                      {/* Justification */}
                      <p className="text-[11px] text-foreground-muted mb-2">{String(reco.justification ?? "")}</p>
                      {/* Diff: current → proposed */}
                      {hasProposed ? (
                        <div className="rounded border border-white/5 bg-black/20 p-2 space-y-1.5">
                          {/* Current value (compact) */}
                          {currentValue != null && currentValue !== "" && op !== "ADD" ? (
                            <div>
                              <p className="text-[9px] text-red-400/70 uppercase tracking-wide mb-0.5">Actuel</p>
                              <RecoValuePreview value={currentValue} />
                            </div>
                          ) : null}
                          {/* Arrow separator for replacements */}
                          {currentValue != null && currentValue !== "" && op !== "ADD" ? (
                            <div className="flex items-center gap-1 text-foreground-muted/40">
                              <div className="flex-1 border-t border-dashed border-foreground-muted/20" />
                              <ChevronRight className="h-3 w-3" />
                              <div className="flex-1 border-t border-dashed border-foreground-muted/20" />
                            </div>
                          ) : null}
                          {/* Proposed value */}
                          <div>
                            <p className="text-[9px] text-emerald-400/70 uppercase tracking-wide mb-0.5">
                              {op === "ADD" ? "A ajouter" : "Propose"}
                            </p>
                            <RecoValuePreview value={reco.proposedValue} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isSelected ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20"}`}>
                      {isSelected ? <CheckCircle className="h-3 w-3" /> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* If this is an RTIS page, surface ADVE reco counts via Notoria */}
      {!isAdve && totalPendingADVE > 0 ? (
        <div className="rounded-lg border border-amber-500/10 bg-amber-800/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="text-sm font-semibold text-amber-200">{totalPendingADVE} recommandation(s) ADVE disponibles</span>
            </div>
            <Link href="/cockpit/brand/notoria" className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-amber-600/20 text-amber-300 hover:bg-amber-600/30">
              <Sparkles className="h-3 w-3" /> Voir dans Notoria
            </Link>
          </div>
          <div className="space-y-2">
            {(["a", "d", "v", "e"] as const).map((k) => {
              const count = (pendingCounts[k] ?? 0) as number;
              if (count === 0) return null;
              const page = ADVE_PAGE_FOR_KEY[k.toUpperCase()];
              return (
                <div key={k} className="flex items-center justify-between rounded border border-white/5 p-2">
                  <div>
                    <div className="text-sm font-medium">Pilier {k.toUpperCase()}</div>
                    <div className="text-xs text-foreground-muted">{count} recommandation(s)</div>
                  </div>
                  <Link href={`/cockpit/brand/${page}`} className="text-xs text-amber-200 hover:underline">Revue</Link>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Inline metadata badges ─────────────────────────────────── */}
      {(() => {
        const filled = inlineKeys.filter(k => isFilled(content[k]));
        return filled.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {filled.map(k => <InlineBadge key={k} label={getFieldLabel(k)} value={Array.isArray(content[k]) ? (content[k] as unknown[]).join(", ") : String(content[k])} />)}
          </div>
        ) : null;
      })()}

      {/* ── All fields in 2-col grid — design system renders each ── */}
      <div className="grid gap-3 md:grid-cols-2">
        {fieldKeys.map(key => (
          <AutoField
            key={key}
            fieldKey={key}
            value={content[key]}
            accent={config.accent}
            onFocus={setFocusedItem}
            pillarKey={config.pillarKey}
          />
        ))}
      </div>
    </div>
  );
}

export { PILLAR_CONFIG };
