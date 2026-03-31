"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { ScoreBadge } from "@/components/shared/score-badge";
import { PILLAR_NAMES, type PillarKey, classifyBrand } from "@/lib/types/advertis-vector";
import { Share2, Download, ArrowRight, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

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

const PILLAR_COLORS: Record<string, string> = {
  a: "var(--color-pillar-a)", d: "var(--color-pillar-d)",
  v: "var(--color-pillar-v)", e: "var(--color-pillar-e)",
  r: "var(--color-pillar-r)", t: "var(--color-pillar-t)",
  i: "var(--color-pillar-i)", s: "var(--color-pillar-s)",
};

export default function IntakeResult({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data: intake, isLoading, error } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: 2, staleTime: 0 }
  );

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
  const scores: Partial<Record<PillarKey, number>> = {
    a: vector.a ?? 0, d: vector.d ?? 0, v: vector.v ?? 0, e: vector.e ?? 0,
    r: vector.r ?? 0, t: vector.t ?? 0, i: vector.i ?? 0, s: vector.s ?? 0,
  };
  const composite = vector.composite ?? 0;
  const confidence = vector.confidence ?? 0;

  const diagnostic = intake.diagnostic as Diagnostic | null;

  // Fallback if diagnostic is old format or null
  const sortedPillars = (Object.entries(scores) as [PillarKey, number][])
    .sort(([, a], [, b]) => b - a);
  const fallbackStrengths = sortedPillars.slice(0, 2);
  const fallbackWeaknesses = sortedPillars.slice(-2).reverse();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Diagnostic ADVE-RTIS — ${intake.companyName}`,
          text: `Score: ${composite}/200`,
          url: window.location.href,
        });
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
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
            Score ADVE-RTIS
          </p>
          <div className="mt-4">
            <ScoreBadge score={composite} size="xl" showRing animated />
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
            Radar 8 piliers
          </h3>
          <div className="flex justify-center">
            <AdvertisRadar scores={scores} size="md" interactive={false} animated />
          </div>
        </div>

        {/* Strengths */}
        <div className="mt-6 rounded-2xl border border-success-subtle bg-success-subtle/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <h3 className="text-sm font-semibold text-foreground">Forces</h3>
          </div>
          {diagnostic?.strengths ? (
            <div className="space-y-3">
              {diagnostic.strengths.map((s) => (
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
        {diagnostic?.recommendations && diagnostic.recommendations.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-bold text-foreground">Recommandations</h2>
            </div>
            {diagnostic.recommendations.map((rec) => (
              <div
                key={rec.key}
                className="rounded-2xl border bg-card p-5"
                style={{ borderColor: `color-mix(in oklch, ${PILLAR_COLORS[rec.key] || "var(--color-border)"} 40%, transparent)` }}
              >
                {/* Pillar header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" style={{ color: PILLAR_COLORS[rec.key] }} />
                    <span className="text-sm font-semibold" style={{ color: PILLAR_COLORS[rec.key] }}>
                      {rec.pillar} ({rec.key.toUpperCase()})
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-destructive">{rec.score.toFixed(1)}/25</span>
                </div>

                {/* Diagnostic */}
                <p className="text-sm leading-relaxed text-foreground-secondary">
                  {rec.diagnostic}
                </p>

                {/* Action items */}
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
          /* Fallback for old-format diagnostics */
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

        {/* CTA */}
        <div className="sticky bottom-0 mt-8 bg-background/95 pb-4 pt-2 backdrop-blur-sm sm:static sm:bg-transparent sm:pb-0">
          <a
            href="mailto:alexandre@upgraders.com?subject=IMPULSION%20-%20Suite%20Quick%20Intake"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover sm:py-3 sm:shadow-none"
          >
            Passer a IMPULSION
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Share & Download */}
        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-overlay"
          >
            <Share2 className="h-4 w-4" />
            Partager
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-overlay">
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>
    </main>
  );
}
