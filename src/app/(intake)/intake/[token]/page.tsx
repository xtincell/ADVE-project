// ============================================================================
// MODULE M35 — Quick Intake Portal: Questionnaire (Long Method)
// Score: 95/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §5.2 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  AI-guided adaptive questionnaire (server-driven questions via getQuestions)
// [x] REQ-2  Business context phase before ADVE pillars (biz → A → D → V → E → R → T → I → S)
// [x] REQ-3  Progress persistence (resume mid-session from DB state)
// [x] REQ-4  Pillar navigation with visual progress indicators
// [x] REQ-5  Mobile-first responsive design (one question at a time on mobile, all on desktop)
// [x] REQ-6  Supports text, select, multiselect, scale question types
// [x] REQ-7  CTA "Voir mon score" triggers completion + scoring
// [x] REQ-8  Tooltips / hover help on every question for non-professionals
// [x] REQ-9  Save & quit button — resume anytime via token link
// [x] REQ-10 localStorage auto-save for connection loss recovery
// [x] REQ-11 Pre-fill wizard from initial contact data (sector, positioning, businessModel)
//
// ROUTE: /intake/[token]
// ============================================================================

"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { HelpCircle, Save, X, ArrowLeft } from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { IntakeProcessingScreen } from "@/components/intake/intake-processing-screen";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useT } from "@/lib/i18n/use-t";

// Phase order: business context first, then 4 ADVE pillars
// RTIS (R, T, I, S) are reserved for the paid version post-conversion
const PHASE_ORDER = ["biz", "a", "d", "v", "e"] as const;
type Phase = (typeof PHASE_ORDER)[number];

// i18n keys — resolved via t() at render time
const PHASE_HEADLINE_KEY: Record<string, string> = {
  biz: "intake.run.headline.biz",
  a: "intake.run.headline.a",
  d: "intake.run.headline.d",
  v: "intake.run.headline.v",
  e: "intake.run.headline.e",
};

const PHASE_LABEL: Record<string, string> = {
  // biz label is resolved via t("intake.run.phase.biz") at render time
  a: PILLAR_NAMES.a,
  d: PILLAR_NAMES.d,
  v: PILLAR_NAMES.v,
  e: PILLAR_NAMES.e,
};

const PILLAR_COLORS: Record<string, string> = {
  biz: "var(--color-primary)",
  a: "var(--color-pillar-a)",
  d: "var(--color-pillar-d)",
  v: "var(--color-pillar-v)",
  e: "var(--color-pillar-e)",
};

interface IntakeQuestion {
  id: string;
  pillar: string;
  question: string;
  type: "text" | "select" | "multiselect" | "scale";
  options?: string[];
  required: boolean;
  tooltip?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers for connection loss recovery
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = (token: string) => `intake_draft_${token}`;

function saveDraftToLocal(token: string, phaseIndex: number, responses: Record<string, unknown>) {
  try {
    const data = { phaseIndex, responses, savedAt: Date.now() };
    localStorage.setItem(LS_KEY(token), JSON.stringify(data));
  } catch { /* quota exceeded or SSR */ }
}

function loadDraftFromLocal(token: string): { phaseIndex: number; responses: Record<string, unknown> } | null {
  try {
    const raw = localStorage.getItem(LS_KEY(token));
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 24h
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(LS_KEY(token));
      return null;
    }
    return data;
  } catch { return null; }
}

function clearDraftFromLocal(token: string) {
  try { localStorage.removeItem(LS_KEY(token)); } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-fill map: intake fields → question IDs
// ─────────────────────────────────────────────────────────────────────────────
function buildPrefill(intake: Record<string, unknown>): Record<string, unknown> {
  const prefill: Record<string, unknown> = {};
  if (intake.businessModel) prefill.biz_model = String(intake.businessModel);
  if (intake.positioning) prefill.biz_positioning = String(intake.positioning);
  return prefill;
}


export default function IntakeQuestionnaire({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useT();
  const router = useRouter();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  // Local cache of all phase responses — survives forward/back navigation
  const phaseResponsesRef = useRef<Record<string, Record<string, unknown>>>({});
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  // Bascule depuis l'import intelligent (?fallback=extraction|llm_unavailable) :
  // on EXPLIQUE pourquoi l'utilisateur atterrit ici au lieu du résultat.
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fallback = new URLSearchParams(window.location.search).get("fallback");
    if (fallback) setFallbackNotice(fallback);
  }, []);

  // Fetch intake data
  const { data: intake, isLoading } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: 2 }
  );

  // Fetch adaptive questions for current phase
  const currentPhase = PHASE_ORDER[currentPhaseIndex]!;
  const questionsQuery = trpc.quickIntake.getQuestions.useQuery(
    { token, pillar: currentPhase },
    { enabled: !!token && initialized, staleTime: 30_000 }
  );

  const utils = trpc.useUtils();
  const advanceMutation = trpc.quickIntake.advance.useMutation();
  // P0-2 (audit UX 2026-07-19) — le complete() guidé (~70 s) était le SEUL
  // chemin sans récupération réseau : une coupure proxy (« Load failed »)
  // affichait l'erreur brute alors que le serveur avait souvent abouti. Même
  // pattern que ingest (commit 1f08a7a) : sonder l'état réel avant de conclure.
  const [recovering, setRecovering] = useState(false);
  const completeMutation = trpc.quickIntake.complete.useMutation({
    onSuccess: () => {
      clearDraftFromLocal(token);
      utils.quickIntake.getByToken.invalidate({ token });
      router.push(`/intake/${token}/result`);
    },
    onError: (err) => {
      if (/load failed|failed to fetch|networkerror|network error|timed?\s?out|timeout|aborted|fetch failed|err_/i.test(err.message)) {
        void (async () => {
          setRecovering(true);
          for (let i = 0; i < 9; i++) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            try {
              const latest = await utils.quickIntake.getByToken.fetch({ token });
              if (latest?.status === "COMPLETED" || latest?.status === "CONVERTED") {
                clearDraftFromLocal(token);
                router.push(`/intake/${token}/result`);
                return;
              }
            } catch {
              /* réseau encore instable — tour suivant */
            }
          }
          setRecovering(false);
          setError(t("intake.run.error.timeout"));
        })();
        return;
      }
      setError(err.message);
    },
  });

  // Update questions when server data changes
  useEffect(() => {
    if (questionsQuery.data?.questions) {
      setQuestions(questionsQuery.data.questions);
      setLoadingQuestions(false);
    }
  }, [questionsQuery.data]);

  // Initialize: restore progress from DB, then check localStorage fallback
  useEffect(() => {
    if (!intake || initialized) return;

    if (intake.status === "COMPLETED" || intake.status === "CONVERTED") {
      router.push(`/intake/${token}/result`);
      return;
    }

    const savedResponses = (intake.responses as Record<string, Record<string, unknown>>) ?? {};
    const prefill = buildPrefill(intake as Record<string, unknown>);

    // Find first unanswered phase
    const answeredPhases = new Set(Object.keys(savedResponses));
    const firstUnanswered = PHASE_ORDER.findIndex((p) => !answeredPhases.has(p));

    // Check localStorage for more recent draft
    const localDraft = loadDraftFromLocal(token);

    if (firstUnanswered === -1) {
      // All phases answered (e.g. AI pre-fill). Start at 0 to encourage review.
      setCurrentPhaseIndex(0);
      const firstPhase = PHASE_ORDER[0]!;
      setResponses(savedResponses[firstPhase] ?? {});
    } else if (localDraft && localDraft.phaseIndex >= firstUnanswered) {
      // localStorage has a more recent position — restore it
      setCurrentPhaseIndex(localDraft.phaseIndex);
      setResponses(localDraft.responses);
    } else {
      setCurrentPhaseIndex(firstUnanswered);
      const phaseKey = PHASE_ORDER[firstUnanswered]!;
      // Merge pre-fill into first phase responses if it's biz
      const phaseResponses = savedResponses[phaseKey] ?? {};
      if (phaseKey === "biz") {
        setResponses({ ...prefill, ...phaseResponses });
      } else {
        setResponses(phaseResponses);
      }
    }

    setInitialized(true);
  }, [intake, initialized, router, token]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-save to localStorage on every response change (debounced 1s)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraftToLocal(token, currentPhaseIndex, responses);
    }, 1000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [responses, currentPhaseIndex, initialized, token]);

  // Check if all phases answered
  const savedResponses = (intake?.responses as Record<string, Record<string, unknown>>) ?? {};
  const allPhasesAnswered = PHASE_ORDER.every(
    (p) => savedResponses[p] && Object.keys(savedResponses[p]!).length > 0
  );

  const phaseColor = PILLAR_COLORS[currentPhase] ?? "var(--color-primary)";
  const totalPhases = PHASE_ORDER.length;
  const overallProgress = allPhasesAnswered
    ? 100
    // lafusee:allow-adhoc-completion: intake wizard progress percentage (questionnaire step counter, not pillar completion)
    : ((currentPhaseIndex + (currentQuestionIndex / Math.max(questions.length, 1))) / totalPhases) * 100;

  // Response handlers
  const setResponse = useCallback((questionId: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const getResponse = (questionId: string): unknown => responses[questionId];

  const isCurrentQuestionAnswered = (): boolean => {
    const q = questions[currentQuestionIndex];
    if (!q) return false;
    const val = getResponse(q.id);
    if (!q.required) return true;
    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "number") return true;
    return val != null && val !== "";
  };

  const allRequiredAnswered = questions.every((q) => {
    if (!q.required) return true;
    const val = getResponse(q.id);
    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "number") return true;
    return val != null && val !== "";
  });

  // Phase slice is "substantive" only when at least one of its values has
  // real content. Refusing to ship empty `{}` here is the front-end's part
  // of the same guarantee enforced server-side in `advance()` — see
  // `hasSubstantiveAnswer` in services/quick-intake/index.ts. The two layers
  // exist in parallel so a future client cannot bypass the rule.
  const sliceHasContent = (slice: Record<string, unknown>): boolean => {
    return Object.values(slice).some((v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string") return v.trim().length > 0;
      if (typeof v === "number") return Number.isFinite(v);
      if (typeof v === "boolean") return true;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
      return false;
    });
  };

  // Save current phase and move to next
  const saveAndAdvance = async (nextPhaseIndex: number) => {
    setError("");
    // Cache regardless — local cache is allowed to be empty; only the
    // server payload must be substantive.
    phaseResponsesRef.current[currentPhase] = { ...responses };

    const hasContent = sliceHasContent(responses);
    if (!hasContent) {
      // Don't ship empty `{}` to the server. If the user wants to skip a
      // phase, they explicitly leave it empty and the next phase opens
      // locally — but no row is persisted. The server's `advance()` would
      // throw EmptyAdvanceError otherwise.
      if (nextPhaseIndex < PHASE_ORDER.length) {
        const nextPhase = PHASE_ORDER[nextPhaseIndex]!;
        setLoadingQuestions(true);
        setCurrentPhaseIndex(nextPhaseIndex);
        setCurrentQuestionIndex(0);
        setResponses(phaseResponsesRef.current[nextPhase] ?? savedResponses[nextPhase] ?? {});
        utils.quickIntake.getQuestions.invalidate({ token, pillar: nextPhase });
      }
      return;
    }

    try {
      await advanceMutation.mutateAsync({
        token,
        responses: { [currentPhase]: responses },
      });

      if (nextPhaseIndex < PHASE_ORDER.length) {
        const nextPhase = PHASE_ORDER[nextPhaseIndex]!;
        setLoadingQuestions(true);
        setCurrentPhaseIndex(nextPhaseIndex);
        setCurrentQuestionIndex(0);
        // Prefer local cache > server snapshot (server snapshot is stale until re-fetch)
        setResponses(phaseResponsesRef.current[nextPhase] ?? savedResponses[nextPhase] ?? {});
        utils.quickIntake.getQuestions.invalidate({ token, pillar: nextPhase });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("intake.run.error.save"));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save & Quit — save current progress and exit
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveAndQuit = async () => {
    setError("");
    // No content → nothing to save server-side; just clear the draft and
    // confirm. The user can resume later, but we never persist a hollow row.
    if (!sliceHasContent(responses)) {
      clearDraftFromLocal(token);
      setShowSaveConfirm(true);
      return;
    }
    try {
      await advanceMutation.mutateAsync({
        token,
        responses: { [currentPhase]: responses },
      });
      clearDraftFromLocal(token);
      setShowSaveConfirm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("intake.run.error.save"));
    }
  };

  const handleComplete = async () => {
    setError("");
    try {
      // Only ship the current phase if it actually has content. If we got
      // here with an empty current phase but earlier phases were filled
      // (allPhasesAnswered is true server-side), `complete()` will succeed
      // anyway. If nothing has ever been filled, `complete()` will throw
      // IncompleteIntakeError and the user is told to fill the form.
      if (!allPhasesAnswered && sliceHasContent(responses)) {
        await advanceMutation.mutateAsync({
          token,
          responses: { [currentPhase]: responses },
        });
      }
      completeMutation.mutate({ token });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("intake.run.error.generic"));
    }
  };

  // Mobile navigation
  const handleMobileNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentPhaseIndex < PHASE_ORDER.length - 1) {
      await saveAndAdvance(currentPhaseIndex + 1);
    } else {
      await handleComplete();
    }
  };

  const handleMobilePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentPhaseIndex > 0) {
      // Cache current responses before going back
      phaseResponsesRef.current[currentPhase] = { ...responses };
      const prevPhase = PHASE_ORDER[currentPhaseIndex - 1]!;
      setResponses(phaseResponsesRef.current[prevPhase] ?? savedResponses[prevPhase] ?? {});
      setCurrentPhaseIndex(currentPhaseIndex - 1);
      setCurrentQuestionIndex(0);
      utils.quickIntake.getQuestions.invalidate({ token, pillar: prevPhase });
    }
  };

  // Desktop navigation
  const handleDesktopNext = async () => {
    if (currentPhaseIndex < PHASE_ORDER.length - 1) {
      await saveAndAdvance(currentPhaseIndex + 1);
    } else {
      await handleComplete();
    }
  };

  const handleDesktopPrev = () => {
    if (currentPhaseIndex > 0) {
      // Cache current responses before going back
      phaseResponsesRef.current[currentPhase] = { ...responses };
      const prevPhase = PHASE_ORDER[currentPhaseIndex - 1]!;
      setResponses(phaseResponsesRef.current[prevPhase] ?? savedResponses[prevPhase] ?? {});
      setCurrentPhaseIndex(currentPhaseIndex - 1);
      setCurrentQuestionIndex(0);
      utils.quickIntake.getQuestions.invalidate({ token, pillar: prevPhase });
    }
  };

  // P0-3 (audit UX 2026-07-19) — pendant les ~70 s du calcul final, le chemin
  // guidé n'affichait qu'un label de bouton : l'écran de traitement soigné
  // (étapes + faits) n'était câblé que sur ingest. Overlay dès le déclenchement.
  if (completeMutation.isPending || recovering) {
    return (
      <IntakeProcessingScreen
        companyName={intake?.companyName ?? t("intake.run.yourBrand")}
        isPending={true}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Save & Quit confirmation overlay
  // ─────────────────────────────────────────────────────────────────────────
  if (showSaveConfirm) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background-raised p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
            <Save className="h-7 w-7 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("intake.run.saved.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
            {t("intake.run.saved.body")}
          </p>
          <div className="mt-4 rounded-lg bg-background-overlay px-4 py-3">
            <code className="break-all text-xs text-primary">
              {typeof window !== "undefined" ? `${window.location.origin}/intake/${token}` : `/intake/${token}`}
            </code>
          </div>
          {/* Honnêteté : AUCUN email n'est envoyé ici (audit 2026-07-16 — la
              phrase « un email de rappel a été envoyé » était fausse ; un lead
              qui s'y fiait et fermait l'onglet perdait son diagnostic). */}
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(`${window.location.origin}/intake/${token}`)
                .catch(() => undefined);
            }}
            className="mt-3 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("intake.run.saved.copy")}
          </button>
          <p className="mt-2 text-xs text-foreground-muted">
            {t("intake.run.saved.keep")}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowSaveConfirm(false)}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background-overlay"
            >
              {t("intake.run.saved.resume")}
            </button>
            <button
              onClick={() => router.push("/intake")}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t("intake.run.saved.quit")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Loading state
  if (isLoading || !initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!intake) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <h1 className="text-2xl font-bold text-destructive">{t("intake.notFound.title")}</h1>
        <p className="mt-2 text-foreground-muted">{t("intake.notFound.body")}</p>
      </main>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Progress bar — sticky top */}
      <div className="sticky top-0 z-10 bg-background/95 px-5 pb-3 pt-4 backdrop-blur-sm sm:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            <span>
              {currentPhase === "biz"
                ? t("intake.run.phase.bizShort")
                : t("intake.run.progress.pillar")
                    .replace("{current}", String(currentPhaseIndex))
                    .replace("{total}", String(totalPhases - 1))}
            </span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Save & Quit button */}
            <button
              onClick={handleSaveAndQuit}
              disabled={advanceMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("intake.run.save")}</span>
              <span className="sm:hidden">{t("intake.run.saveShort")}</span>
            </button>
            {/* Cancel & Quit button — ConfirmDialog DS (0 dialogue natif dans le funnel) */}
            <button
              onClick={() => setShowQuitConfirm(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-error/40 text-error transition-colors hover:bg-error/10"
              title={t("intake.run.cancelQuit")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <ConfirmDialog
              open={showQuitConfirm}
              onClose={() => setShowQuitConfirm(false)}
              onConfirm={() => {
                clearDraftFromLocal(token);
                router.push("/intake");
              }}
              title={t("intake.run.quitConfirm.title")}
              message={t("intake.run.quitConfirm.message")}
              confirmLabel={t("intake.run.quitConfirm.confirm")}
              cancelLabel={t("intake.run.quitConfirm.cancel")}
            />
          </div>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background-overlay">
          <div
            className="h-full rounded-full transition-all duration-slow ease-out"
            style={{ width: `${overallProgress}%`, backgroundColor: phaseColor }}
          />
        </div>
        {/* Phase dots */}
        <div className="mt-2 flex justify-center gap-1.5">
          {PHASE_ORDER.map((p, i) => {
            const isAnswered = savedResponses[p] && Object.keys(savedResponses[p]!).length > 0;
            const isCurrent = i === currentPhaseIndex;
            return (
              <button
                key={p}
                onClick={() => {
                  setResponses(savedResponses[p] ?? {});
                  setCurrentPhaseIndex(i);
                  setCurrentQuestionIndex(0);
                  utils.quickIntake.getQuestions.invalidate({ token, pillar: p });
                }}
                className={`h-2 rounded-full transition-all ${isCurrent ? "w-6" : "w-2"}`}
                style={{
                  backgroundColor: isCurrent
                    ? phaseColor
                    : isAnswered
                      ? `color-mix(in oklch, ${PILLAR_COLORS[p] ?? "var(--color-primary)"} 50%, transparent)`
                      : "var(--color-border-subtle)",
                }}
                aria-label={
                  p === "biz"
                    ? t("intake.run.phase.biz")
                    : t("intake.run.aria.pillar")
                        .replace("{letter}", p.toUpperCase())
                        .replace("{name}", PILLAR_NAMES[p as PillarKey])
                }
              />
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-6 sm:px-8">
        {/* Phase watermark */}
        <div
          className="pointer-events-none fixed right-4 top-20 select-none text-[120px] font-black leading-none opacity-[0.03] sm:hidden"
          style={{ color: phaseColor }}
        >
          {currentPhase === "biz" ? "?" : currentPhase.toUpperCase()}
        </div>

        {/* Bandeau bascule import → questionnaire (jamais de saut muet) */}
        {fallbackNotice && (
          <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-warning">
                  {fallbackNotice === "llm_unavailable"
                    ? t("intake.run.fallback.llm")
                    : t("intake.run.fallback.extraction")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">
                  {t("intake.run.fallback.body")}
                </p>
              </div>
              <button
                onClick={() => setFallbackNotice(null)}
                className="shrink-0 rounded-lg p-1 text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
                aria-label={t("intake.run.close")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Phase header */}
        <div className="mb-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              backgroundColor: `color-mix(in oklch, ${phaseColor} 15%, transparent)`,
              color: phaseColor,
            }}
          >
            {currentPhase === "biz"
              ? t("intake.run.phase.biz")
              : `${currentPhase.toUpperCase()} — ${PHASE_LABEL[currentPhase]}`}
          </span>
          <h1 className="mt-3 flex items-center justify-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            {t(PHASE_HEADLINE_KEY[currentPhase] ?? "")} <AiBadge />
          </h1>
          {currentPhase === "biz" && (
            <p className="mt-2 text-sm text-foreground-muted">
              {t("intake.run.bizHelp")}
            </p>
          )}
        </div>

        {/* Loading questions indicator */}
        {(loadingQuestions || questionsQuery.isLoading) && questions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm text-foreground-muted">
              {t("intake.run.loadingQuestions")}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: all questions visible */}
            <div className="hidden space-y-6 sm:block">
              {questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={getResponse(q.id)}
                  onChange={(val) => setResponse(q.id, val)}
                  phaseColor={phaseColor}
                />
              ))}
              {questions.some((q) => q.id.includes("_ai_")) && (
                <p className="text-xs text-foreground-muted italic">
                  {t("intake.run.aiNote")}
                </p>
              )}
            </div>

            {/* Mobile: one question at a time */}
            <div className="flex flex-1 flex-col sm:hidden">
              {currentQ && (
                <>
                  <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-foreground-muted">
                    {t("intake.run.questionCounter")
                      .replace("{current}", String(currentQuestionIndex + 1))
                      .replace("{total}", String(questions.length))}
                    {currentQ.id.includes("_ai_") && t("intake.run.aiTag")}
                  </p>
                  <QuestionField
                    question={currentQ}
                    value={getResponse(currentQ.id)}
                    onChange={(val) => setResponse(currentQ.id, val)}
                    phaseColor={phaseColor}
                    mobile
                  />
                </>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Navigation — sticky bottom */}
      <div className="sticky bottom-0 border-t border-border-subtle bg-background/95 px-5 py-4 backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          {/* Desktop nav */}
          <div className="hidden sm:flex sm:w-full sm:justify-between">
            <button
              onClick={handleDesktopPrev}
              disabled={currentPhaseIndex === 0}
              className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background-overlay disabled:opacity-30"
            >
              {t("intake.run.prev")}
            </button>
            <button
              onClick={handleDesktopNext}
              disabled={!allRequiredAnswered || advanceMutation.isPending || completeMutation.isPending}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {completeMutation.isPending
                ? t("intake.run.computing")
                : currentPhaseIndex < PHASE_ORDER.length - 1
                  ? t("intake.run.next")
                  : t("intake.run.seeScore")}
            </button>
          </div>

          {/* Mobile nav */}
          <div className="flex w-full items-center justify-between sm:hidden">
            <button
              onClick={handleMobilePrev}
              disabled={currentPhaseIndex === 0 && currentQuestionIndex === 0}
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground disabled:opacity-30"
            >
              {t("intake.run.prevShort")}
            </button>
            {/* P2-1 (audit UX) — compteur basé sur les PHASES : l'ancien calcul
                utilisait questions.length (variable par phase adaptative) et
                affichait un total qui sautait/mentait. */}
            <span className="text-xs text-foreground-muted" role="status" aria-live="polite">
              {t("intake.run.stepCounter")
                .replace("{phase}", String(currentPhaseIndex + 1))
                .replace("{phases}", String(PHASE_ORDER.length))
                .replace("{q}", String(currentQuestionIndex + 1))
                .replace("{qs}", String(questions.length || 1))}
            </span>
            <button
              onClick={handleMobileNext}
              disabled={
                (currentQ?.required && !isCurrentQuestionAnswered()) ||
                advanceMutation.isPending ||
                completeMutation.isPending
              }
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {completeMutation.isPending
                ? t("intake.run.computingShort")
                : currentPhaseIndex === PHASE_ORDER.length - 1 &&
                    currentQuestionIndex === questions.length - 1
                  ? t("intake.run.scoreShort")
                  : t("intake.run.next")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip — appears on hover (desktop) or tap (mobile)
// ─────────────────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const { t } = useT();
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-primary-subtle hover:text-primary"
        aria-label={t("intake.run.help")}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {show && (
        <>
          {/* Backdrop for mobile tap-to-dismiss */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShow(false)} />
          <div className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-border bg-background-raised px-4 py-3 text-xs leading-relaxed text-foreground-secondary shadow-xl sm:w-80">
            {text}
            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-border bg-background-raised" />
          </div>
        </>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionField — renders the appropriate input for each question type
// ─────────────────────────────────────────────────────────────────────────────

interface QuestionFieldProps {
  question: IntakeQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  phaseColor: string;
  mobile?: boolean;
}

function QuestionField({ question, value, onChange, phaseColor, mobile }: QuestionFieldProps) {
  const { t } = useT();
  const inputClass =
    "w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary";

  const labelContent = (
    <>
      {question.question}
      {question.required && <span className="text-destructive"> *</span>}
      {question.tooltip && <Tooltip text={question.tooltip} />}
    </>
  );

  switch (question.type) {
    case "text":
      return (
        <div className={mobile ? "flex flex-1 flex-col" : ""}>
          <label className={`mb-2 block ${mobile ? "text-base" : "text-sm"} font-medium text-foreground`}>
            {labelContent}
          </label>
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={mobile ? 5 : 3}
            className={`${inputClass} ${mobile ? "flex-1" : ""}`}
            placeholder={t("intake.run.answerPlaceholder")}
            style={{ minHeight: mobile ? "120px" : undefined }}
          />
        </div>
      );

    case "select":
      return (
        <div>
          <label className={`mb-2 block ${mobile ? "text-base" : "text-sm"} font-medium text-foreground`}>
            {labelContent}
          </label>
          <div className="space-y-2">
            {question.options?.map((opt) => {
              const [optKey, optLabel] = opt.includes("::")
                ? opt.split("::")
                : [opt, opt];
              const isSelected = value === opt || value === optKey;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    isSelected
                      ? "border-2 font-medium shadow-sm"
                      : "border-border bg-background-raised hover:bg-background-overlay"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: phaseColor,
                          backgroundColor: `color-mix(in oklch, ${phaseColor} 8%, transparent)`,
                          color: phaseColor,
                        }
                      : undefined
                  }
                >
                  {optLabel ?? optKey}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "multiselect":
      return (
        <div>
          <label className={`mb-2 block ${mobile ? "text-base" : "text-sm"} font-medium text-foreground`}>
            {labelContent}
          </label>
          <p className="mb-3 text-xs text-foreground-muted">{t("intake.run.multiHint")}</p>
          <div className="space-y-2">
            {question.options?.map((opt) => {
              const [optKey, optLabel] = opt.includes("::")
                ? opt.split("::")
                : [opt, opt];
              const selected = Array.isArray(value) ? value : [];
              const isSelected = selected.includes(opt) || selected.includes(optKey);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selected.filter((v: string) => v !== opt && v !== optKey));
                    } else {
                      onChange([...selected, opt]);
                    }
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    isSelected
                      ? "border-2 font-medium shadow-sm"
                      : "border-border bg-background-raised hover:bg-background-overlay"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: phaseColor,
                          backgroundColor: `color-mix(in oklch, ${phaseColor} 8%, transparent)`,
                          color: phaseColor,
                        }
                      : undefined
                  }
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs ${
                        isSelected ? "text-white" : "border-border"
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: phaseColor, borderColor: phaseColor }
                          : undefined
                      }
                    >
                      {isSelected && "\u2713"}
                    </span>
                    {optLabel ?? optKey}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );

    case "scale":
      return (
        <div>
          <label className={`mb-2 block ${mobile ? "text-base" : "text-sm"} font-medium text-foreground`}>
            {labelContent}
          </label>
          {/* P1-4 (audit UX 2026-07-19) — 10 boutons 40px fixes débordaient le
              viewport mobile (~466px > 360px). Grille fluide : les boutons se
              partagent la largeur, 2 rangées de 5 sur petit écran. */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-foreground-muted">1</span>
            <div className="grid flex-1 grid-cols-5 gap-1.5 sm:grid-cols-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                const isSelected = value === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className={`flex h-10 min-w-0 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? "border-2 text-white shadow-sm"
                        : "border-border bg-background-raised hover:bg-background-overlay"
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: phaseColor, borderColor: phaseColor }
                        : undefined
                    }
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-foreground-muted">10</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}
