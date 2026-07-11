/**
 * OracleProgressivePanel — Phase 21 F-F (ADR-0073)
 *
 * Panel orchestrateur de la page Oracle qui consomme :
 *   - `oracle.listSections` (tRPC, lazy seed)        → sections persistées
 *   - `useOracleStream(strategyId)` (NSP SSE hook)   → live phase per section
 *   - `oracle.generateSection` (mutation)            → bouton individuel
 *   - `oracle.retrySection` (mutation)               → bouton retry FAILED/STALE
 *   - `oracle.assembleOracle` (mutation)             → bouton "Assembler" avec scope dropdown
 *
 * Layout :
 *   ┌─ Header avec stats (X complets / Y partiels / Z FAILED / W STALE)
 *   ├─ Bouton "Assembler L'Oracle" + scope dropdown (ALL / MISSING / STALE)
 *   ├─ Console live (OracleLiveConsole)
 *   └─ Grid 35 sections (OracleSectionCard)
 *       └─ Modal erreur Zod sur clic FAILED (OracleSectionFailureModal)
 *
 * Cohabitation avec le legacy `enrichOracle` button : ce panel est
 * additionnel ; pas de remplacement automatique du legacy en F-F.
 */

"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCanOperate } from "@/components/cockpit/use-can-operate";
import { useOracleStream } from "@/hooks/use-oracle-stream";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";
import { OracleSectionCard, type SectionDbStatus } from "./section-card";
import { OracleLiveConsole } from "./live-console";
import { OracleSectionFailureModal } from "./section-failure-modal";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";

const SECTION_REGISTRY_BY_NUMBER = (() => {
  const map = new Map<number, (typeof SECTION_REGISTRY)[number]>();
  for (const meta of SECTION_REGISTRY) {
    const n = Number(meta.number);
    if (Number.isInteger(n)) map.set(n, meta);
  }
  return map;
})();

type AssembleScope = "ALL" | "MISSING" | "STALE";

const SCOPE_OPTIONS: ReadonlyArray<{ value: AssembleScope; label: string; hint: string }> = [
  { value: "ALL", label: "Tout (35 sections)", hint: "REGEN forcé même sur sections COMPLETE" },
  { value: "MISSING", label: "Manquantes (PENDING)", hint: "Uniquement les sections jamais générées" },
  { value: "STALE", label: "Périmées (STALE / FAILED)", hint: "Reprise après échec ou amont muté" },
];

export interface OracleProgressivePanelProps {
  strategyId: string;
}

export function OracleProgressivePanel(props: OracleProgressivePanelProps): React.ReactElement {
  const { strategyId } = props;

  // ── Data : DB persisté + live stream ──────────────────────────────
  const sectionsQuery = trpc.oracle.listSections.useQuery(
    { strategyId },
    { enabled: !!strategyId, refetchInterval: 30_000 },
  );
  const stream = useOracleStream(strategyId);

  // ── Mutations ─────────────────────────────────────────────────────
  const generateMutation = trpc.oracle.generateSection.useMutation({
    onSuccess: () => sectionsQuery.refetch(),
  });
  const retryMutation = trpc.oracle.retrySection.useMutation({
    onSuccess: () => sectionsQuery.refetch(),
  });
  const assembleMutation = trpc.oracle.assembleOracle.useMutation({
    onSuccess: () => sectionsQuery.refetch(),
  });

  // ── UI state ──────────────────────────────────────────────────────
  const [scope, setScope] = useState<AssembleScope>("MISSING");
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [failureModalSectionId, setFailureModalSectionId] = useState<number | null>(null);

  // ── Derive joined view (DB × stream) ──────────────────────────────
  const sections = sectionsQuery.data?.sections ?? [];
  const sectionsById = useMemo(() => {
    const map = new Map<number, (typeof sections)[number]>();
    for (const s of sections) map.set(s.sectionId, s);
    return map;
  }, [sections]);

  const stats = useMemo(() => {
    const tally = { pending: 0, generating: 0, complete: 0, failed: 0, stale: 0 };
    for (const s of sections) {
      const k = s.status as SectionDbStatus;
      if (k === "PENDING") tally.pending++;
      else if (k === "GENERATING") tally.generating++;
      else if (k === "COMPLETE") tally.complete++;
      else if (k === "FAILED") tally.failed++;
      else if (k === "STALE") tally.stale++;
    }
    return tally;
  }, [sections]);

  const isAssemblerRunning = assembleMutation.isPending || stream.assemblerState.phase === "running";
  const anyMutationPending =
    generateMutation.isPending || retryMutation.isPending || assembleMutation.isPending;
  // Founders are not operators: oracle.* generation is operator-only (init.ts).
  // Disable the controls + show a read-only banner instead of click→FORBIDDEN.
  // The legacy governed `enrichOracle` path on this page remains founder-usable.
  const canOperate = useCanOperate();

  // ── Render ────────────────────────────────────────────────────────
  const failedSection = failureModalSectionId !== null ? sectionsById.get(failureModalSectionId) : null;
  const failedMeta = failureModalSectionId !== null ? SECTION_REGISTRY_BY_NUMBER.get(failureModalSectionId) : null;

  return (
    <div className="space-y-4">
      {/* Header — stats + assembler control */}
      <div className="rounded-xl border border-border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <h3 className="font-semibold text-foreground">Génération progressive</h3>
            <span className="rounded-full bg-info/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-info">
              Section par section
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-success">{stats.complete} complets</span>
            <span className="text-error">{stats.failed} ratés</span>
            <span className="text-warning">{stats.stale} périmés</span>
            <span className="text-foreground-muted">{stats.pending + stats.generating} en attente</span>
          </div>
        </div>

        {!canOperate ? (
          <p className="mt-3 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-foreground-secondary">
            L&apos;assemblage de l&apos;Oracle est pris en charge par votre équipe UPgraders. Vous pouvez suivre l&apos;avancement ici en lecture seule.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => assembleMutation.mutate({ strategyId, scope })}
            disabled={anyMutationPending || !canOperate}
            className="flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-error disabled:opacity-40"
            title={`Assemble les sections (portée : ${scope === "ALL" ? "toutes" : scope === "MISSING" ? "manquantes" : "à rafraîchir"}) — chaque section est générée puis validée individuellement.`}
          >
            {isAssemblerRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Assembler en cours…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Assembler L&apos;Oracle
              </>
            )}
          </button>

          {/* Scope dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setScopeMenuOpen(!scopeMenuOpen)}
              disabled={anyMutationPending || !canOperate}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised disabled:opacity-40"
            >
              Scope: <span className="font-bold text-foreground">{SCOPE_OPTIONS.find((o) => o.value === scope)?.label}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {scopeMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-surface-raised shadow-xl">
                {SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setScope(opt.value);
                      setScopeMenuOpen(false);
                    }}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs transition-colors hover:bg-background ${
                      opt.value === scope ? "bg-background" : ""
                    }`}
                  >
                    <span className="font-semibold text-foreground">{opt.label}</span>
                    <span className="text-foreground-muted">{opt.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {stream.error && (
            <span className="rounded-md border border-warning/40 bg-warning/15 px-2 py-1 text-2xs text-warning">
              stream: {stream.error}
            </span>
          )}
        </div>

        {/* Assembler progress bar (live) */}
        {stream.assemblerState.phase === "running" && stream.assemblerState.total ? (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-2xs text-foreground-muted">
              <span>
                {stream.assemblerState.completed ?? 0}/{stream.assemblerState.total}
                {typeof stream.assemblerState.failed === "number" && stream.assemblerState.failed > 0
                  ? ` · ${stream.assemblerState.failed} ratés`
                  : ""}
                {typeof stream.assemblerState.currentSectionId === "number"
                  ? ` · §${String(stream.assemblerState.currentSectionId).padStart(2, "0")} en cours`
                  : ""}
              </span>
              <span>{stream.assemblerState.scope}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-success transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((stream.assemblerState.completed ?? 0) / stream.assemblerState.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Live console */}
      <OracleLiveConsole log={stream.log} isStreaming={stream.isStreaming} />

      {/* Section grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {sections.map((dbSection) => {
          const meta = SECTION_REGISTRY_BY_NUMBER.get(dbSection.sectionId);
          if (!meta) return null;
          const streamPhase = stream.sectionsState.get(dbSection.sectionId)?.phase;
          const streamConfidence = stream.sectionsState.get(dbSection.sectionId)?.confidence;
          return (
            <OracleSectionCard
              key={dbSection.sectionId}
              sectionNumber={meta.number}
              sectionId={dbSection.sectionId}
              sectionTitle={meta.title}
              tier={(meta.tier ?? "CORE") as "CORE" | "BIG4_BASELINE" | "DISTINCTIVE"}
              dbStatus={dbSection.status as SectionDbStatus}
              streamPhase={streamPhase}
              confidence={streamConfidence ?? dbSection.confidence}
              lastError={dbSection.lastError as { errorCode?: string | null; errorMessage?: string | null } | null}
              isStale={dbSection.staleAt != null}
              disabled={!canOperate || anyMutationPending || isAssemblerRunning}
              onAction={(mode) => {
                if (mode === "RETRY") {
                  retryMutation.mutate({ strategyId, sectionId: dbSection.sectionId });
                } else {
                  generateMutation.mutate({ strategyId, sectionId: dbSection.sectionId, mode });
                }
              }}
              onShowError={
                dbSection.status === "FAILED" ? () => setFailureModalSectionId(dbSection.sectionId) : undefined
              }
            />
          );
        })}
      </div>

      {/* Failure modal */}
      {failedSection && failedMeta && (
        <OracleSectionFailureModal
          open={failureModalSectionId !== null}
          onOpenChange={(open) => !open && setFailureModalSectionId(null)}
          sectionNumber={failedMeta.number}
          sectionTitle={failedMeta.title}
          errorCode={(failedSection.lastError as { errorCode?: string | null } | null)?.errorCode ?? failedSection.errorCode}
          errorMessage={(failedSection.lastError as { errorMessage?: string | null } | null)?.errorMessage}
          attempts={(failedSection.lastError as { attempts?: number | null } | null)?.attempts}
          durationMs={
            failedSection.lastGenerationCompletedAt && failedSection.lastGenerationStartedAt
              ? new Date(failedSection.lastGenerationCompletedAt).getTime() -
                new Date(failedSection.lastGenerationStartedAt).getTime()
              : undefined
          }
          zodIssues={(failedSection.lastError as { zodIssues?: unknown } | null)?.zodIssues ?? null}
          onRetry={() => retryMutation.mutate({ strategyId, sectionId: failedSection.sectionId })}
          retryDisabled={retryMutation.isPending}
        />
      )}
    </div>
  );
}
