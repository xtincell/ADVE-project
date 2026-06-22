"use client";

import { ADVE_STORAGE_KEYS } from "@/domain";

import { useState, useEffect, useMemo, useRef } from "react";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { trpc } from "@/lib/trpc/client";
import {
  FileText,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Loader2,
  CheckCircle,
  AlertCircle,
  Circle,
  Sparkles,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { OracleEnrichmentTracker } from "@/components/neteru/oracle-enrichment-tracker";
import { ArtemisLaunchModal } from "@/components/cockpit/artemis-launch-modal";
import { RtisCascadeModal } from "@/components/cockpit/rtis-cascade-modal";
import { OracleProgressivePanel } from "@/components/cockpit/oracle/progressive-panel";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

interface BlockerHint {
  pillarKey: string;
  reasons: readonly string[];
  missingFields?: readonly string[];
}

const STATUS_CONFIG = {
  complete: { icon: CheckCircle, color: "text-success", bg: "bg-success/20", border: "border-success/30", label: "Complete" },
  partial: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/20", border: "border-warning/30", label: "Partial" },
  empty: { icon: Circle, color: "text-foreground-muted", bg: "bg-background/20", border: "border-border", label: "Vide" },
};

export default function PropositionPage() {
  const strategyId = useCurrentStrategyId();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isArtemisRunning, setIsArtemisRunning] = useState(false);
  const [enrichLog, setEnrichLog] = useState<string[]>([]);
  const [enrichResult, setEnrichResult] = useState<{
    enriched: string[]; failed: string[]; seeded: string[]; total: number;
    frameworksExecuted: number; finalScore: string; finalComplete: number; finalPartial: number; finalEmpty: number;
    sectionFeedback: Record<string, { before: string; after: string; action: string }>;
    message: string;
    /** Phase 13 R2 — intentId exposé pour streaming/replay NSP. */
    intentId?: string | null;
  } | null>(null);
  /** Phase 13 R2 — last known IntentEmission id pour le tracker NSP replay. */
  const [lastIntentId, setLastIntentId] = useState<string | null>(null);
  const [prevReport, setPrevReport] = useState<Record<string, string>>({});
  const [changedSections, setChangedSections] = useState<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [cascadeModalOpen, setCascadeModalOpen] = useState(false);
  const [externalBlockers, setExternalBlockers] = useState<BlockerHint[] | undefined>(undefined);

  const completeness = trpc.strategyPresentation.completeness.useQuery(
    { strategyId: strategyId ?? "" },
    {
      enabled: !!strategyId,
      // 3s poll during Artemis runs (live progression). Outside Artemis, poll
      // every 60s in background so derived sections (plan-activation,
      // production-livrables, budget, timeline-gouvernance, conditions-etapes)
      // pass to "complete" naturellement quand leur données amont changent
      // (campagnes créées sur /cockpit/operate, contracts ajoutés, etc.).
      refetchInterval: isArtemisRunning ? 3000 : 60000,
      // Refetch on window focus : si user édite des données dans un autre tab
      // puis revient sur Oracle, le report se met à jour immédiatement.
      refetchOnWindowFocus: true,
    }
  );

  // Maturity report — used to compute "RTIS ready ?" (green/red Lancer button)
  // and to auto-prompt the cascade when ADVE hits 100% with RTIS still empty.
  const maturity = trpc.pillar.maturityReport.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId, refetchOnWindowFocus: false },
  );

  const adveAllComplete = useMemo(() => {
    const p = maturity.data?.pillars as Record<string, { currentStage?: string }> | undefined;
    if (!p) return false;
    return (ADVE_STORAGE_KEYS).every((k) => {
      const stage = p[k]?.currentStage;
      return stage === "ENRICHED" || stage === "COMPLETE";
    });
  }, [maturity.data]);

  const rtisReady = useMemo(() => {
    const p = maturity.data?.pillars as Record<string, { currentStage?: string }> | undefined;
    if (!p) return false;
    return (["r", "t", "i", "s"] as const).every((k) => {
      const stage = p[k]?.currentStage;
      return stage === "ENRICHED" || stage === "COMPLETE";
    });
  }, [maturity.data]);

  // "Oracle prêt à compiler" = ADVE ENRICHED+ ET RTIS ENRICHED+. RTIS seul ne
  // suffit pas : le gate ORACLE_ENRICH veto si ADVE est sous-ENRICHED, et
  // l'ArtemisLaunchModal montrerait un DIAGNOSE en contradiction avec un
  // bouton vert. Bouton vert = vraie promesse "compile sans heurt".
  const oracleReadyToCompile = adveAllComplete && rtisReady;

  // Auto-prompt the cascade modal once when ADVE reaches 100% and RTIS is
  // still empty/incomplete. Tracked per-strategy via localStorage so the
  // user is never re-prompted after dismissing or completing once.
  useEffect(() => {
    if (!strategyId) return;
    if (!adveAllComplete) return;
    if (rtisReady) return;
    if (cascadeModalOpen) return;
    const flagKey = `lafusee:rtis-cascade-prompted:${strategyId}`;
    try {
      if (window.localStorage.getItem(flagKey) === "yes") return;
      window.localStorage.setItem(flagKey, "yes");
      setCascadeModalOpen(true);
    } catch {
      // localStorage indispo (private mode) — on n'auto-prompt pas pour
      // éviter une boucle. User peut toujours déclencher via le bouton rouge.
    }
  }, [strategyId, adveAllComplete, rtisReady, cascadeModalOpen]);

  // Detect section changes during polling
  useEffect(() => {
    const report = completeness.data ?? {};
    if (Object.keys(prevReport).length > 0) {
      const newChanges = new Set(changedSections);
      for (const [id, status] of Object.entries(report)) {
        if (prevReport[id] && prevReport[id] !== status) {
          newChanges.add(id);
          const section = SECTION_REGISTRY.find((s) => s.id === id);
          setEnrichLog((prev) => [...prev, `${section?.number ?? ""} ${section?.title ?? id}: ${prevReport[id]} → ${status}`]);
        }
      }
      setChangedSections(newChanges);
    }
    setPrevReport(report);
  }, [completeness.data]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [enrichLog]);

  const enrichMutation = trpc.strategyPresentation.enrichOracle.useMutation({
    onMutate: () => {
      setIsArtemisRunning(true);
      setEnrichResult(null);
      setChangedSections(new Set());
      setEnrichLog(["Artemis demarre — analyse des sections incompletes..."]);
    },
    onSuccess: (data) => {
      setEnrichResult(data);
      setIsArtemisRunning(false);
      // Phase 13 R2 — capture intentId pour tracker NSP replay (post-completion)
      if (data.intentId) setLastIntentId(data.intentId);
      completeness.refetch();
      setEnrichLog((prev) => [
        ...prev,
        `--- Termine: ${data.finalScore} ---`,
        // data.message couvre les cas "0 framework applicable" / "Oracle complet"
        // qui sont invisibles dans les compteurs. Toujours surfacé en clair.
        data.message,
        `${data.enriched.length} enrichies, ${data.frameworksExecuted} frameworks, ${data.seeded.length} metriques seedees`,
        ...(data.skipped.length > 0
          ? [`${data.skipped.length} sections sans framework applicable (derivées) : ${data.skipped.slice(0, 5).join(", ")}${data.skipped.length > 5 ? "…" : ""}`]
          : []),
        ...(data.intentId ? [`IntentEmission: ${data.intentId.slice(0, 16)}…`] : []),
        ...(data.failed.length > 0 ? [`Echecs: ${data.failed.join(", ")}`] : []),
      ]);
    },
    onError: (err) => {
      setIsArtemisRunning(false);
      // ADR-0022: Oracle errors carry a structured cause { code, governor,
      // remediation, recoverable, context } via TRPCError.cause.
      const cause = (err as unknown as {
        data?: {
          cause?: {
            code?: string;
            governor?: string;
            remediation?: string;
            recoverable?: boolean;
            context?: { blockers?: BlockerHint[] };
          };
        };
      }).data?.cause;
      const code = cause?.code;
      const governor = cause?.governor;
      const remediation = cause?.remediation;
      const blockers = cause?.context?.blockers;

      // ORACLE-101 = piliers ADVE pas prêts. On rouvre le modal de préparation
      // avec les blockers du serveur pour que l'user puisse réparer.
      if (code === "ORACLE-101") {
        setExternalBlockers(blockers);
        setLaunchModalOpen(true);
        setEnrichLog((prev) => [...prev, "Préparation du vault nécessaire — voir le modal."]);
        return;
      }

      const lines: string[] = [];
      if (code && governor) {
        lines.push(`ERREUR ${code} (${governor}) — ${err.message.replace(/^\[ORACLE-\d+\]\s*/, "")}`);
        if (remediation) lines.push(`→ ${remediation}`);
        lines.push(`→ Voir /console/governance/oracle-incidents pour le triage.`);
      } else {
        lines.push(`ERREUR: ${err.message}`);
      }
      setEnrichLog((prev) => [...prev, ...lines]);
    },
  });

  const shareMutation = trpc.strategyPresentation.shareLink.useMutation({
    onSuccess: (data) => setShareUrl(data.url),
  });

  if (!strategyId) {
    return (
      <div className="flex h-96 items-center justify-center text-foreground-muted">
        Selectionnez une strategie pour acceder a la proposition.
      </div>
    );
  }

  const report = completeness.data ?? {};
  const totalSections = SECTION_REGISTRY.length;
  const completeSections = Object.values(report).filter((s) => s === "complete").length;
  const partialSections = Object.values(report).filter((s) => s === "partial").length;
  const emptySections = Object.values(report).filter((s) => s === "empty").length;
  // lafusee:allow-adhoc-completion: display-only assembled% (Oracle section-count ratio, not the canonical pillar completion gate)
  const pct = totalSections > 0 ? Math.round((completeSections / totalSections) * 100) : 0;

  // ── 3 cartes de préparation — état RÉEL de la cascade (pas de prose mock) ──
  const readinessCards = [
    {
      key: "adve", title: "Fondations ADVE",
      ready: adveAllComplete,
      body: adveAllComplete
        ? "Les 4 piliers fondateurs (A·D·V·E) sont enrichis — socle prêt à dériver."
        : "Complétez A·D·V·E (au moins ENRICHED) : c'est le socle qui nourrit toute la cascade.",
    },
    {
      key: "rtis", title: "Dérivés RTIS",
      ready: rtisReady,
      body: rtisReady
        ? "R·T·I·S dérivés depuis ADVE — diagnostic, marché, potentiel et stratégie consolidés."
        : "Lancez la cascade R+T → I → S pour dériver le diagnostic et la stratégie depuis ADVE.",
    },
    {
      key: "oracle", title: "Assemblage Oracle",
      ready: oracleReadyToCompile,
      body: oracleReadyToCompile
        ? `${completeSections}/${totalSections} sections — Artemis peut compiler le livrable sans heurt.`
        : `${totalSections - completeSections} sections restantes — préparez ADVE + RTIS pour débloquer l'assemblage.`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <FileText className="h-7 w-7 text-accent" />
          L&apos;Oracle — Proposition Stratégique
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Document vivant assemblé depuis vos piliers ADVE-RTIS, Artemis et outils Glory.
        </p>
      </div>

      {/* ─ Synthèse vivante (hero) — données réelles ─ */}
      <div className="ck-oracle-hero">
        <div className="ck-oracle-hero__glow" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ck-oracle-hero__rocket" src="/brand/illustrations/rocket-3d.png" alt="" />
        <span className="ck-oracle-hero__eyebrow"><Sparkles /> Synthèse vivante · réévaluée en continu</span>
        <h2 className="ck-oracle-hero__h">
          {oracleReadyToCompile
            ? <>Votre proposition stratégique est <span className="hl">prête à compiler</span> — {completeSections}/{totalSections} sections assemblées.</>
            : <>Votre proposition s&apos;assemble en continu — <span className="hl">{pct}%</span> du livrable est consolidé.</>}
        </h2>
        <p className="ck-oracle-hero__p">
          L&apos;Oracle est un livrable consulting de {totalSections} sections, assemblé et réévalué par Mestor (méthode ADVE-RTIS).
          {isArtemisRunning ? " Artemis exécute les frameworks — les sections se mettent à jour en temps réel." : ` ${totalSections - completeSections} section(s) restantes.`}
        </p>
        <div className="ck-oracle-hero__stats">
          <div><span className="k">Complètes</span><b className="text-success">{completeSections}/{totalSections}</b></div>
          <div><span className="k">Partielles</span><b>{partialSections}</b></div>
          <div><span className="k">Vides</span><b>{emptySections}</b></div>
          <div><span className="k">Assemblé</span><b style={{ color: "var(--accent)" }}>{pct}%</b></div>
        </div>
      </div>

      {/* ─ 3 cartes de préparation — état réel de la cascade ─ */}
      <div className="ck-grid--3">
        {readinessCards.map((c) => {
          const Icon = c.ready ? CheckCircle : AlertCircle;
          return (
            <div className="ck-oracle-card" key={c.key}>
              <span className="ck-oracle-card__ic" style={c.ready ? { background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" } : undefined}><Icon /></span>
              <h3 className="ck-oracle-card__t">{c.title}</h3>
              <p className="ck-oracle-card__b">{c.body}</p>
            </div>
          );
        })}
      </div>

      {/* ─ Assembleur Artemis + console live ─ */}
      <div className="ck-orc">
        <div className="ck-orc__head">
          <div className="ck-orc__head-l">
            <h3>Assembler L&apos;Oracle</h3>
            <span className="ck-orc__adr">{pct}% assemblé · méthode ADVE-RTIS</span>
            <AiBadge />
          </div>
          <div className="ck-orc__tally">
            <span className="ok">{completeSections} complètes</span>
            <span className="stale">{partialSections} partielles</span>
            <span className="idle">{emptySections} vides</span>
          </div>
        </div>

        {/* ADR — bouton contextuel (préparer ADVE / RTIS / lancer Artemis) — wiring inchangé */}
        <div className="ck-orc__controls">
          <button
            className="ck-orc__assemble"
            data-variant={oracleReadyToCompile ? "ready" : undefined}
            disabled={enrichMutation.isPending}
            title={
              oracleReadyToCompile
                ? "ADVE + RTIS prêts — Oracle peut compiler les 35 sections sans heurt."
                : !adveAllComplete
                  ? "Vos 4 fondations ADVE ne sont pas encore enrichies. Un clic ouvre la préparation automatique."
                  : "RTIS pas encore dérivés — un clic ouvre la cascade RTIS pour préparer Oracle."
            }
            onClick={() => {
              if (!adveAllComplete) { setExternalBlockers(undefined); setLaunchModalOpen(true); return; }
              if (!rtisReady) { setCascadeModalOpen(true); return; }
              setExternalBlockers(undefined); setLaunchModalOpen(true);
            }}
          >
            {enrichMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Artemis en cours…</>
              : oracleReadyToCompile ? <><Sparkles /> Lancer Artemis</>
              : !adveAllComplete ? <><AlertCircle /> Préparer ADVE d&apos;abord</>
              : <><AlertCircle /> Préparer RTIS d&apos;abord</>}
          </button>
          <button
            className="ck-orc__preview"
            onClick={() => { if (shareUrl) window.open(shareUrl, "_blank"); else shareMutation.mutate({ strategyId: strategyId! }); }}
          >
            <ExternalLink /> Ouvrir le livrable
          </button>
        </div>

        {/* Progress (pendant Artemis) */}
        {isArtemisRunning && (
          <div className="ck-orc__progress">
            <div className="ck-orc__progress-meta"><span>{completeSections}/{totalSections} sections</span><span>Artemis en cours</span></div>
            <div className="ck-orc__progress-track"><div className="ck-orc__progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        {/* Console live (enrichLog réel) */}
        {enrichLog.length > 0 && (
          <div className="ck-orc__console">
            <div className="ck-orc__console-head"><span className="dot" /> Console live · télémétrie d&apos;assemblage</div>
            {enrichLog.map((line, i) => {
              const tone = line.startsWith("ERREUR") ? "fail" : line.startsWith("---") ? "ok" : undefined;
              return (
                <div className="ck-orc__line" data-tone={tone} key={i}>
                  <span className="ck-orc__line-t">[{String(i).padStart(2, "0")}]</span>
                  <span className="ck-orc__line-m">{line}</span>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        )}

        {/* Final result details */}
        {enrichResult && !isArtemisRunning && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-accent">{enrichResult.finalScore} — {enrichResult.message}</p>
            {enrichResult.seeded.length > 0 && (
              <p className="text-xs text-success">Métriques seedées : {enrichResult.seeded.join(", ")}</p>
            )}
            <details className="text-xs text-foreground-muted" open>
              <summary className="cursor-pointer hover:text-foreground-secondary">Détail par section</summary>
              <div className="mt-1 max-h-48 overflow-y-auto rounded border border-border bg-background/50 p-2">
                {Object.entries(enrichResult.sectionFeedback).map(([id, fb]) => (
                  <div key={id} className="flex items-center justify-between border-b border-border/30 py-1 last:border-0">
                    <span className="text-foreground-secondary">{id}</span>
                    <span className={fb.after === "complete" ? "text-success" : fb.after === "partial" ? "text-warning" : "text-foreground-muted"}>
                      {fb.after} <span className="text-foreground-muted">({fb.action})</span>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {enrichMutation.error && <p className="text-xs text-error">{enrichMutation.error.message}</p>}

        {/* Phase 13 (B7 + R2) — NSP streaming tracker */}
        <OracleEnrichmentTracker intentId={lastIntentId} completenessReport={completeness.data ?? undefined} />

        {/* ─ Lien public / partage (strategyPresentation.shareLink) ─ */}
        <div className="ck-orc__share">
          <div className="ck-orc__share-l">
            <span className="ck-orc__share-h"><Share2 /> Page générée — lien public</span>
            <span className="ck-orc__share-s">Livrable partageable au client. Choisissez la vue (persona) à partager.</span>
          </div>
          <div className="ck-orc__share-personas">
            {(["consultant", "client", "creative"] as const).map((persona) => (
              <button key={persona} disabled={shareMutation.isPending} onClick={() => shareMutation.mutate({ strategyId: strategyId!, persona })}>
                {shareMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 />}{persona}
              </button>
            ))}
          </div>
          {shareUrl && (
            <div className="ck-orc__share-row">
              <code className="ck-orc__share-url">{typeof window !== "undefined" ? window.location.origin : ""}{shareUrl}</code>
              <button className="ck-orc__share-copy" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <><Check /> Copié</> : <><Copy /> Copier</>}
              </button>
              <a className="ck-orc__share-open" href={shareUrl} target="_blank" rel="noopener"><ExternalLink /> Prévisualiser</a>
            </div>
          )}
        </div>
      </div>

      {/* Phase 21 F-F (ADR-0073) — Génération progressive avec stream SSE (granulaire). */}
      <OracleProgressivePanel strategyId={strategyId} />

      {/* ─ Grille des 35 sections (statut live) ─ */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Les {totalSections} sections</h2>
        <div className="ck-orc__grid">
          {SECTION_REGISTRY.map((section) => {
            const status = report[section.id] ?? "empty";
            const st = status === "complete" ? "ok" : status === "partial" ? "stale" : "idle";
            const StatusIcon = STATUS_CONFIG[status].icon;
            const justChanged = changedSections.has(section.id);
            const tier = (section as { tier?: string }).tier;
            return (
              <div key={section.id} className={`ck-orc__sec${justChanged ? " changed" : ""}`} data-st={st}>
                <span className="ck-orc__sec-ic" data-st={st}><StatusIcon /></span>
                <div className="ck-orc__sec-b">
                  <div className="ck-orc__sec-top">
                    <span className="ck-orc__sec-n">{section.number}</span>
                    <span className="ck-orc__sec-title">{section.title}</span>
                    {tier ? <span className="ck-orc__sec-tier" data-t={tier}>{tier === "CORE" ? "Core" : tier === "BIG4_BASELINE" ? "Big4" : "Distinct"}</span> : null}
                  </div>
                  <div className="ck-orc__sec-meta">
                    <span className="ck-orc__sec-st" data-st={st}>{STATUS_CONFIG[status].label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export PDF (server-side jspdf walk) */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={async () => {
            if (!strategyId) return;
            try {
              const res = await fetch(`/api/export/oracle/${strategyId}/pdf`);
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error ?? "Export failed");
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "oracle.pdf";
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            } catch (e) {
              console.error("[export-pdf] failed:", e);
              alert("Export PDF a échoué. Voir la console.");
            }
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background"
        >
          <FileText className="h-4 w-4" /> Export PDF
        </button>
      </div>

      <ArtemisLaunchModal
        open={launchModalOpen}
        onOpenChange={setLaunchModalOpen}
        strategyId={strategyId}
        onLaunch={() => enrichMutation.mutate({ strategyId })}
        externalBlockers={externalBlockers}
      />

      <RtisCascadeModal
        open={cascadeModalOpen}
        onOpenChange={setCascadeModalOpen}
        strategyId={strategyId}
        onCompleted={() => {
          // Cascade succeeded — refresh maturity so the button flips green
          // immediately, before localStorage flag matters.
          void maturity.refetch();
        }}
      />
    </div>
  );
}
