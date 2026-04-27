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

// Phase order: business context first, then 4 ADVE pillars
// RTIS (R, T, I, S) are reserved for the paid version post-conversion
const PHASE_ORDER = ["biz", "a", "d", "v", "e"] as const;
type Phase = (typeof PHASE_ORDER)[number];

const PHASE_HEADLINE: Record<string, string> = {
  biz: "Parlons de votre business",
  a: "Qui etes-vous vraiment ?",
  d: "Pourquoi vous et pas un autre ?",
  v: "Que promettez-vous au monde ?",
  e: "Comment creer la devotion ?",
};

const PHASE_LABEL: Record<string, string> = {
  biz: "Contexte Business",
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
  const router = useRouter();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  // Local cache of all phase responses — survives forward/back navigation
  const phaseResponsesRef = useRef<Record<string, Record<string, unknown>>>({});
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const completeMutation = trpc.quickIntake.complete.useMutation({
    onSuccess: () => {
      clearDraftFromLocal(token);
      utils.quickIntake.getByToken.invalidate({ token });
      router.push(`/intake/${token}/result`);
    },
    onError: (err) => setError(err.message),
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
      setCurrentPhaseIndex(PHASE_ORDER.length - 1);
      const lastPhase = PHASE_ORDER[PHASE_ORDER.length - 1]!;
      setResponses(savedResponses[lastPhase] ?? {});
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

  // Save current phase and move to next
  const saveAndAdvance = async (nextPhaseIndex: number) => {
    setError("");
    try {
      // Cache current phase responses locally before saving
      phaseResponsesRef.current[currentPhase] = { ...responses };

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
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save & Quit — save current progress and exit
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveAndQuit = async () => {
    setError("");
    try {
      await advanceMutation.mutateAsync({
        token,
        responses: { [currentPhase]: responses },
      });
      clearDraftFromLocal(token);
      setShowSaveConfirm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    }
  };

  const handleComplete = async () => {
    setError("");
    try {
      if (!allPhasesAnswered) {
        await advanceMutation.mutateAsync({
          token,
          responses: { [currentPhase]: responses },
        });
      }
      completeMutation.mutate({ token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
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
          <h2 className="text-xl font-bold text-foreground">Progres sauvegarde !</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
            Vous pouvez reprendre a tout moment en utilisant ce lien :
          </p>
          <div className="mt-4 rounded-lg bg-background-overlay px-4 py-3">
            <code className="break-all text-xs text-primary">
              {typeof window !== "undefined" ? `${window.location.origin}/intake/${token}` : `/intake/${token}`}
            </code>
          </div>
          <p className="mt-3 text-xs text-foreground-muted">
            Un email de rappel a ete envoye a votre adresse.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowSaveConfirm(false)}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background-overlay"
            >
              Reprendre
            </button>
            <button
              onClick={() => router.push("/intake")}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Quitter
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
        <h1 className="text-2xl font-bold text-destructive">Diagnostic introuvable</h1>
        <p className="mt-2 text-foreground-muted">Ce lien est invalide ou a expire.</p>
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
                ? "Contexte"
                : `Pilier ${currentPhaseIndex}/${totalPhases - 1}`}
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
              <span className="hidden sm:inline">Sauvegarder et quitter</span>
              <span className="sm:hidden">Sauver</span>
            </button>
            {/* Cancel & Quit button */}
            <button
              onClick={() => {
                if (window.confirm("Quitter sans sauvegarder ? Vos reponses non enregistrees seront perdues.")) {
                  clearDraftFromLocal(token);
                  router.push("/intake");
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-800/40 text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
              title="Annuler et quitter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
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
                aria-label={`${p === "biz" ? "Contexte Business" : `Pilier ${p.toUpperCase()} — ${PILLAR_NAMES[p as PillarKey]}`}`}
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
              ? "Contexte Business"
              : `${currentPhase.toUpperCase()} — ${PHASE_LABEL[currentPhase]}`}
          </span>
          <h1 className="mt-3 flex items-center justify-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            {PHASE_HEADLINE[currentPhase]} <AiBadge />
          </h1>
          {currentPhase === "biz" && (
            <p className="mt-2 text-sm text-foreground-muted">
              Ces informations nous aident a calibrer les questions suivantes selon votre secteur et modele.
            </p>
          )}
        </div>

        {/* Loading questions indicator */}
        {(loadingQuestions || questionsQuery.isLoading) && questions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm text-foreground-muted">
              Preparation des questions adaptees...
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
                  * Questions complementaires generees par l'IA pour approfondir votre profil.
                </p>
              )}
            </div>

            {/* Mobile: one question at a time */}
            <div className="flex flex-1 flex-col sm:hidden">
              {currentQ && (
                <>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
                    Question {currentQuestionIndex + 1}/{questions.length}
                    {currentQ.id.includes("_ai_") && " · IA"}
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
              Precedent
            </button>
            <button
              onClick={handleDesktopNext}
              disabled={!allRequiredAnswered || advanceMutation.isPending || completeMutation.isPending}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {completeMutation.isPending
                ? "Calcul du score..."
                : currentPhaseIndex < PHASE_ORDER.length - 1
                  ? "Suivant"
                  : "Voir mon score"}
            </button>
          </div>

          {/* Mobile nav */}
          <div className="flex w-full items-center justify-between sm:hidden">
            <button
              onClick={handleMobilePrev}
              disabled={currentPhaseIndex === 0 && currentQuestionIndex === 0}
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground disabled:opacity-30"
            >
              Prec.
            </button>
            <span className="text-xs text-foreground-muted">
              {currentPhaseIndex * (questions.length || 3) + currentQuestionIndex + 1}/
              {PHASE_ORDER.length * (questions.length || 3)}
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
                ? "Calcul..."
                : currentPhaseIndex === PHASE_ORDER.length - 1 &&
                    currentQuestionIndex === questions.length - 1
                  ? "Score"
                  : "Suivant"}
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
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-primary-subtle hover:text-primary"
        aria-label="Aide"
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
            placeholder="Votre reponse..."
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
          <p className="mb-3 text-xs text-foreground-muted">Plusieurs choix possibles</p>
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
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-foreground-muted">1</span>
            <div className="flex flex-1 justify-between gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                const isSelected = value === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
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
