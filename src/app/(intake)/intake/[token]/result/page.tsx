// ============================================================================
// MODULE M35 — Quick Intake Portal: Result Page (ADVE /100)
// Score: 92/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §5.2 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1 → ADVE-only):
// [x] REQ-1  Score /100 composite display (4 piliers ADVE) with animated badge
// [x] REQ-2  Classification (Zombie → Icône) with contextual summary
// [x] REQ-3  Radar 4 piliers ADVE visualization (AdvertisRadar component)
// [x] REQ-4  Forces / faiblesses breakdown (ADVE only)
// [x] REQ-5  Diagnostic synthetique with AI-generated recommendations + actions
// [x] REQ-6  CTA vers IMPULSION + CTA upsell RTIS diagnostic complet
// [x] REQ-7  Shareable link (navigator.share + clipboard fallback)
// [x] REQ-8  PDF export (jspdf + html2canvas, real PDF generation)
// [x] REQ-9  Pillar detail drill-down (expandable pillar score breakdown, ADVE only)
//
// ROUTE: /intake/[token]/result
// ============================================================================

"use client";

import { use, useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { ScoreBadge } from "@/components/shared/score-badge";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import {
  Share2, Download, ArrowRight, TrendingUp, AlertTriangle,
  CheckCircle, Lightbulb, Zap, ChevronDown, ChevronUp, Loader2,
  Rocket, Check,
} from "lucide-react";

interface DiagnosticRecommendation {
  pillar: string;
  key: string;
  score: number;
  diagnostic: string;
  actions: string[];
}

interface DiagnosticStrength {
  pillar: string;
  key: string;
  score: number;
  insight: string;
}

interface Diagnostic {
  classification: string;
  summary: string;
  strengths: DiagnosticStrength[];
  weaknesses: { pillar: string; key: string; score: number }[];
  recommendations: DiagnosticRecommendation[];
}

// ADVE-only: intake result shows only 4 pillars, scored /100
const ADVE_KEYS: PillarKey[] = ["a", "d", "v", "e"];

const PILLAR_COLORS: Record<string, string> = {
  a: "var(--color-pillar-a)", d: "var(--color-pillar-d)",
  v: "var(--color-pillar-v)", e: "var(--color-pillar-e)",
  r: "var(--color-pillar-r)", t: "var(--color-pillar-t)",
  i: "var(--color-pillar-i)", s: "var(--color-pillar-s)",
};

export default function IntakeResult({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [shareConfirm, setShareConfirm] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = me?.role === "ADMIN";
  const [convertSuccess, setConvertSuccess] = useState(false);

  const convertMutation = trpc.quickIntake.convert.useMutation({
    onSuccess: () => setConvertSuccess(true),
  });

  const { data: intake, isLoading, error } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: 2, staleTime: 0 }
  );

  // Social proof: count of completed intakes
  const { data: intakeCount } = trpc.quickIntake.getCompletedCount.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const togglePillar = useCallback((key: string) => {
    setExpandedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ─── PDF Export ─────────────────────────────────────────────────────────
  const handlePdfExport = useCallback(async () => {
    if (!reportRef.current || !intake) return;
    setPdfGenerating(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Capture the report section as a canvas image
      const canvas = await html2canvas(reportRef.current, {
        useCORS: true,
        backgroundColor: "#0a0a0f", // Match dark background
        logging: false,
      } as Parameters<typeof html2canvas>[1]);

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm

      const pdf = new jsPDF("p", "mm", "a4");

      // If content is taller than one page, split across pages
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add footer with La Fusee branding
      const vec = intake.advertis_vector as Record<string, number>;
      const adveScore = (vec.a ?? 0) + (vec.d ?? 0) + (vec.v ?? 0) + (vec.e ?? 0);
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 130);
        pdf.text(
          `Diagnostic ADVE — ${intake.companyName} — Score: ${adveScore}/100 — La Fusee`,
          105,
          290,
          { align: "center" },
        );
      }

      pdf.save(`diagnostic-${intake.companyName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("[PDF export]", err);
    } finally {
      setPdfGenerating(false);
    }
  }, [intake]);

  // ─── Share ──────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        const vec = intake?.advertis_vector as Record<string, number> | undefined;
        const adveTotal = vec ? (vec.a ?? 0) + (vec.d ?? 0) + (vec.v ?? 0) + (vec.e ?? 0) : 0;
        await navigator.share({
          title: `Diagnostic ADVE — ${intake?.companyName}`,
          text: `Score: ${adveTotal}/100`,
          url: window.location.href,
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setShareConfirm(true);
      setTimeout(() => setShareConfirm(false), 2000);
    }
  }, [intake]);

  // ─── Loading / Error states ─────────────────────────────────────────────
  if (isLoading || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  if (error || !intake || !intake.advertis_vector) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <h1 className="text-2xl font-bold text-foreground">Resultat non disponible</h1>
        <p className="mt-2 text-foreground-muted">
          Ce diagnostic n'est pas encore termine ou le lien est invalide.
        </p>
        {error && <p className="mt-2 text-xs text-destructive">Erreur : {error.message}</p>}
      </main>
    );
  }

  const vector = intake.advertis_vector as Record<string, number>;
  // ADVE-only scores for intake result — capped at 25 per pillar
  const cap = (v: number) => Math.round(Math.min(v, 25) * 10) / 10;
  const scores: Partial<Record<PillarKey, number>> = {
    a: cap(vector.a ?? 0), d: cap(vector.d ?? 0), v: cap(vector.v ?? 0), e: cap(vector.e ?? 0),
  };
  // Composite /100 = sum of capped ADVE pillars
  const composite = Math.round(((scores.a ?? 0) + (scores.d ?? 0) + (scores.v ?? 0) + (scores.e ?? 0)) * 10) / 10;
  const confidence = vector.confidence ?? 0;

  const diagnostic = intake.diagnostic as Diagnostic | null;

  // Sorted ADVE pillars for drill-down
  const allPillarsSorted = (ADVE_KEYS.map((k) => [k, scores[k] ?? 0] as [PillarKey, number]))
    .sort(([, a], [, b]) => b - a);
  const fallbackStrengths = allPillarsSorted.slice(0, 2);
  const fallbackWeaknesses = allPillarsSorted.slice(-2).reverse();

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Social proof banner */}
      {intakeCount && intakeCount > 10 && (
        <div className="bg-primary-subtle/30 px-5 py-2 text-center text-xs text-foreground-muted">
          {intakeCount}+ marques ont deja mesure leur score ADVE
        </div>
      )}

      {/* Report content — wrapped in ref for PDF capture */}
      <div ref={reportRef} className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Company name */}
        <p className="text-center text-sm font-medium text-foreground-muted">
          Diagnostic de marque
        </p>
        <h1 className="mt-1 text-center text-xl font-bold text-foreground">
          {intake.companyName}
        </h1>

        {/* Score reveal */}
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-card p-8 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
            Score ADVE
          </p>
          <div className="mt-4">
            <ScoreBadge score={composite} maxScore={100} size="xl" showRing animated />
          </div>
          {confidence < 0.7 && (
            <p className="mt-4 max-w-sm text-center text-xs text-foreground-muted">
              Confiance : {(confidence * 100).toFixed(0)}% — Estimation initiale.
              Un diagnostic complet affinera ces resultats.
            </p>
          )}
        </div>

        {/* Summary */}
        {diagnostic?.summary && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm leading-relaxed text-foreground-secondary">
              {diagnostic.summary}
            </p>
          </div>
        )}

        {/* Radar */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h3 className="mb-4 text-center text-sm font-semibold text-foreground">
            Radar 4 piliers ADVE
          </h3>
          <div className="flex justify-center">
            <AdvertisRadar scores={scores} maxScore={25} size="md" interactive={false} animated pillarKeys={["a", "d", "v", "e"]} />
          </div>
        </div>

        {/* ─── Pillar Breakdown (drill-down) ────────────────────────────────── */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Detail par pilier
          </h3>
          <div className="space-y-2">
            {allPillarsSorted.map(([key, value]) => {
              const isExpanded = expandedPillars.has(key);
              const pct = (value / 25) * 100;
              const strength = diagnostic?.strengths?.find((s) => s.key === key);
              const rec = diagnostic?.recommendations?.find((r) => r.key === key);

              return (
                <div key={key} className="rounded-xl border border-border-subtle overflow-hidden">
                  <button
                    onClick={() => togglePillar(key)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background-overlay"
                  >
                    {/* Pillar badge */}
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                      style={{ backgroundColor: PILLAR_COLORS[key] }}
                    >
                      {key.toUpperCase()}
                    </span>
                    {/* Name + progress bar */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {PILLAR_NAMES[key]}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: PILLAR_COLORS[key] }}>
                          {value.toFixed(1)}/25
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background-overlay">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: PILLAR_COLORS[key] }}
                        />
                      </div>
                    </div>
                    {/* Expand chevron */}
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-foreground-muted" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-foreground-muted" />}
                  </button>
                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border-subtle px-4 py-3">
                      {strength && (
                        <p className="text-xs leading-relaxed text-success">
                          <strong>Force :</strong> {strength.insight}
                        </p>
                      )}
                      {rec && (
                        <>
                          <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">
                            {rec.diagnostic}
                          </p>
                          {rec.actions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {rec.actions.map((action, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                                  <p className="text-xs text-foreground-muted">{action}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {!strength && !rec && (
                        <p className="text-xs text-foreground-muted">
                          Score moyen. Un diagnostic approfondi IMPULSION revelerait les leviers d'amelioration.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths summary — ADVE only */}
        <div className="mt-6 rounded-2xl border border-success-subtle bg-success-subtle/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <h3 className="text-sm font-semibold text-foreground">Forces</h3>
          </div>
          {diagnostic?.strengths ? (
            <div className="space-y-3">
              {diagnostic.strengths.filter((s) => (ADVE_KEYS as string[]).includes(s.key)).map((s) => (
                <div key={s.key} className="rounded-lg bg-background-raised/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: PILLAR_COLORS[s.key] }}>
                      {s.pillar} ({s.key.toUpperCase()})
                    </span>
                    <span className="text-sm font-semibold text-success">{s.score.toFixed(1)}/25</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted">{s.insight}</p>
                </div>
              ))}
            </div>
          ) : (
            fallbackStrengths.map(([key, value]) => (
              <div key={key} className="mb-2 flex items-center justify-between">
                <span className="text-sm text-foreground-secondary">
                  {PILLAR_NAMES[key]} ({key.toUpperCase()})
                </span>
                <span className="text-sm font-semibold text-success">{value.toFixed(1)}/25</span>
              </div>
            ))
          )}
        </div>

        {/* Recommendations — the real value */}
        {diagnostic?.recommendations && diagnostic.recommendations.filter((r) => (ADVE_KEYS as string[]).includes(r.key)).length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-bold text-foreground">Recommandations</h2>
            </div>
            {diagnostic.recommendations.filter((r) => (ADVE_KEYS as string[]).includes(r.key)).map((rec) => (
              <div
                key={rec.key}
                className="rounded-2xl border bg-card p-5"
                style={{ borderColor: `color-mix(in oklch, ${PILLAR_COLORS[rec.key] || "var(--color-border)"} 40%, transparent)` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" style={{ color: PILLAR_COLORS[rec.key] }} />
                    <span className="text-sm font-semibold" style={{ color: PILLAR_COLORS[rec.key] }}>
                      {rec.pillar} ({rec.key.toUpperCase()})
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-destructive">{rec.score.toFixed(1)}/25</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground-secondary">
                  {rec.diagnostic}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Actions prioritaires
                  </p>
                  {rec.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <p className="text-sm text-foreground">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-destructive-subtle bg-destructive-subtle/10 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">A ameliorer</h3>
            </div>
            {fallbackWeaknesses.map(([key, value]) => (
              <div key={key} className="mb-2 flex items-center justify-between">
                <span className="text-sm text-foreground-secondary">
                  {PILLAR_NAMES[key]} ({key.toUpperCase()})
                </span>
                <span className="text-sm font-semibold text-destructive">{value.toFixed(1)}/25</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA + actions — outside ref so they don't appear in PDF */}
      <div className="mx-auto w-full max-w-3xl px-5 pb-12 sm:px-8">
        {/* CTA principal : voir la proposition strategique */}
        {intake.convertedToId && (
          <div className="rounded-2xl border-2 border-primary bg-primary-subtle/20 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  Votre proposition strategique
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                  L'Oracle a synthetise votre diagnostic ADVE en une proposition complete :
                  plateforme strategique, territoire creatif, plan d'activation, budget et roadmap.
                </p>
              </div>
            </div>
            <div className="sticky bottom-0 mt-5 bg-primary-subtle/20 pb-1 pt-1 sm:static">
              <a
                href={`/shared/strategy/${token}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover sm:py-3"
              >
                Voir L'Oracle — Proposition Strategique
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* CTA secondaire : contacter l'equipe */}
        <div className={`rounded-2xl border border-border bg-background-raised p-6 sm:p-8 ${intake.convertedToId ? "mt-4" : ""}`}>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background-overlay">
              <ArrowRight className="h-5 w-5 text-foreground-muted" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                Passer a IMPULSION
              </h3>
              <p className="mt-1 text-sm text-foreground-secondary">
                Transformez ce diagnostic en plan d'action concret sur 90 jours avec l'accompagnement La Fusee.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <a
              href={`mailto:alexandre@upgraders.com?subject=${encodeURIComponent(`IMPULSION — ${intake.companyName} (Score: ${composite}/100)`)}&body=${encodeURIComponent(`Bonjour,\n\nDiagnostic Quick Intake pour ${intake.companyName}.\nScore ADVE : ${composite}/100 (${intake.classification ?? ""})\n\nLien : ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background-overlay px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background-raised"
            >
              Contacter l'equipe La Fusee
            </a>
          </div>
        </div>

        {/* Admin: Convert to Brand */}
        {isAdmin && intake && (
          <div className="mt-6 rounded-xl border border-amber-800/40 bg-amber-950/20 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                <Rocket className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300">Zone Admin</p>
                <p className="text-xs text-amber-400/70">Injecter ce diagnostic comme marque dans le systeme</p>
              </div>
              {convertSuccess ? (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                  <Check className="h-4 w-4" />
                  Marque creee
                </span>
              ) : (
                <button
                  onClick={() => convertMutation.mutate({
                    intakeId: intake.id,
                    userId: me!.id,
                  })}
                  disabled={convertMutation.isPending || intake.status === "CONVERTED"}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
                >
                  {convertMutation.isPending
                    ? "Injection..."
                    : intake.status === "CONVERTED"
                      ? "Deja converti"
                      : "Injecter la marque"}
                </button>
              )}
            </div>
            {convertMutation.error && (
              <p className="mt-2 text-xs text-red-400">{convertMutation.error.message}</p>
            )}
          </div>
        )}

        {/* CTA upsell RTIS — Diagnostic complet */}
        <div className="mt-6 rounded-2xl border border-transparent p-[1px]"
          style={{ background: "linear-gradient(135deg, var(--color-pillar-r), var(--color-pillar-t), var(--color-pillar-i), var(--color-pillar-s))", borderRadius: "1rem" }}>
          <div className="rounded-2xl bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  Passez au diagnostic complet
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                  Les piliers Risk, Track, Innovation et Strategy revelent les angles morts
                  et le potentiel cache de votre marque. Decouvrez votre score complet /200.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <a
                href={`/intake/${token}/upgrade`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-500 hover:to-indigo-500"
              >
                Debloquer RTIS — Diagnostic complet
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Share & Download */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-overlay"
          >
            <Share2 className="h-4 w-4" />
            {shareConfirm ? "Lien copie !" : "Partager"}
          </button>
          <button
            onClick={handlePdfExport}
            disabled={pdfGenerating}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-overlay disabled:opacity-50"
          >
            {pdfGenerating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {pdfGenerating ? "Generation..." : "Telecharger PDF"}
          </button>
        </div>
      </div>
    </main>
  );
}
