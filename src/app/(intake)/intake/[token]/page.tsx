"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

const PILLAR_ORDER: PillarKey[] = ["a", "d", "v", "e", "r", "t", "i", "s"];

const PILLAR_QUESTIONS: Record<PillarKey, string[]> = {
  a: [
    "Quelle est l'histoire fondatrice de votre marque ?",
    "Quelle est votre mission en une phrase ?",
    "Quelles valeurs guident vos decisions au quotidien ?",
  ],
  d: [
    "Qu'est-ce qui vous differencie de vos concurrents ?",
    "Comment decririez-vous votre identite visuelle ?",
    "Quel ton de voix utilisez-vous dans vos communications ?",
  ],
  v: [
    "Quelle promesse faites-vous a vos clients ?",
    "Quels sont vos produits/services phares ?",
    "Comment decrivez-vous l'experience que vos clients vivent ?",
  ],
  e: [
    "Comment vos clients interagissent-ils avec votre marque ?",
    "Avez-vous une communaute active autour de votre marque ?",
    "Quels canaux utilisez-vous pour engager votre audience ?",
  ],
  r: [
    "Quels risques majeurs pesent sur votre marque ?",
    "Avez-vous un plan de gestion de crise ?",
    "Comment gerez-vous les retours negatifs ?",
  ],
  t: [
    "Comment mesurez-vous le succes de votre marque ?",
    "Quels KPIs suivez-vous regulierement ?",
    "Avez-vous une validation marche de votre proposition ?",
  ],
  i: [
    "Avez-vous une roadmap strategique formalisee ?",
    "Comment est structuree votre equipe marketing ?",
    "Quel est votre budget communication annuel approximatif ?",
  ],
  s: [
    "Avez-vous un document de guidelines de marque ?",
    "Votre strategie de marque est-elle documentee ?",
    "Comment assurez-vous la coherence entre vos differents canaux ?",
  ],
};

const PILLAR_HEADLINE: Record<PillarKey, string> = {
  a: "Qui etes-vous vraiment ?",
  d: "Pourquoi vous et pas un autre ?",
  v: "Que promettez-vous au monde ?",
  e: "Comment creer la devotion ?",
  r: "Quels sont vos angles morts ?",
  t: "Comment mesurez-vous le succes ?",
  i: "De la strategie a l'action ?",
  s: "Comment assembler le tout ?",
};

const PILLAR_COLORS: Record<PillarKey, string> = {
  a: "var(--color-pillar-a)",
  d: "var(--color-pillar-d)",
  v: "var(--color-pillar-v)",
  e: "var(--color-pillar-e)",
  r: "var(--color-pillar-r)",
  t: "var(--color-pillar-t)",
  i: "var(--color-pillar-i)",
  s: "var(--color-pillar-s)",
};

export default function IntakeQuestionnaire({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [currentPillar, setCurrentPillar] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: intake, isLoading } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: 2 }
  );

  const utils = trpc.useUtils();
  const advanceMutation = trpc.quickIntake.advance.useMutation();
  const completeMutation = trpc.quickIntake.complete.useMutation({
    onSuccess: () => {
      // Invalidate the cache so the result page fetches fresh data
      utils.quickIntake.getByToken.invalidate({ token });
      router.push(`/intake/${token}/result`);
    },
    onError: (err) => setError(err.message),
  });

  // Restore progress from saved responses in DB
  useEffect(() => {
    if (!intake || initialized) return;

    if (intake.status === "COMPLETED" || intake.status === "CONVERTED") {
      router.push(`/intake/${token}/result`);
      return;
    }

    const savedResponses = intake.responses as Record<string, Record<string, string>> | null;
    if (savedResponses) {
      // Find the first pillar that hasn't been answered yet
      const answeredPillars = new Set(Object.keys(savedResponses));
      const firstUnanswered = PILLAR_ORDER.findIndex((p) => !answeredPillars.has(p));

      if (firstUnanswered === -1) {
        // All pillars answered — go to last pillar so user can hit "Voir mon score"
        setCurrentPillar(7);
        const lastPillarResponses = savedResponses["s"] ?? {};
        setResponses(lastPillarResponses);
      } else {
        setCurrentPillar(firstUnanswered);
        // Pre-fill responses for the current pillar if any
        const pillarKey = PILLAR_ORDER[firstUnanswered]!;
        if (savedResponses[pillarKey]) {
          setResponses(savedResponses[pillarKey]);
        }
      }
    }
    setInitialized(true);
  }, [intake, initialized, router, token]);

  // When navigating between pillars, load saved responses for that pillar
  useEffect(() => {
    if (!intake || !initialized) return;
    const savedResponses = intake.responses as Record<string, Record<string, string>> | null;
    const pillarKey = PILLAR_ORDER[currentPillar];
    if (pillarKey && savedResponses?.[pillarKey]) {
      setResponses(savedResponses[pillarKey]);
    }
  }, [currentPillar, intake, initialized]);

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

  const pillar = PILLAR_ORDER[currentPillar]!;
  const questions = PILLAR_QUESTIONS[pillar];
  const pillarColor = PILLAR_COLORS[pillar];
  const overallProgress = ((currentPillar * 3 + currentQuestion + 1) / 24) * 100;

  // Check if all 8 pillars are already answered in DB
  const savedResponses = intake.responses as Record<string, Record<string, string>> | null;
  const allPillarsAnsweredInDB = savedResponses
    ? PILLAR_ORDER.every((p) => savedResponses[p] && Object.keys(savedResponses[p]).length > 0)
    : false;

  const currentQ = questions[currentQuestion];
  const currentAnswer = responses[`q${currentQuestion}`] ?? "";

  const savePillarAndAdvance = async (nextPillarIndex: number) => {
    // Save current pillar responses to DB
    await advanceMutation.mutateAsync({ token, responses: { [pillar]: responses } });

    if (nextPillarIndex <= 7) {
      const nextPillarKey = PILLAR_ORDER[nextPillarIndex]!;
      // Load saved responses for the next pillar
      const savedNext = savedResponses?.[nextPillarKey] ?? {};
      setResponses(savedNext);
      setCurrentPillar(nextPillarIndex);
      setCurrentQuestion(0);
    }
  };

  const handleComplete = async () => {
    // Save current pillar first if not yet saved
    if (!allPillarsAnsweredInDB) {
      await advanceMutation.mutateAsync({ token, responses: { [pillar]: responses } });
    }
    completeMutation.mutate({ token });
  };

  const handleMobileNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentPillar < 7) {
      await savePillarAndAdvance(currentPillar + 1);
    } else {
      await handleComplete();
    }
  };

  const handleMobilePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentPillar > 0) {
      const prevPillarKey = PILLAR_ORDER[currentPillar - 1]!;
      const savedPrev = savedResponses?.[prevPillarKey] ?? {};
      setResponses(savedPrev);
      setCurrentPillar(currentPillar - 1);
      setCurrentQuestion(2);
    }
  };

  const handleDesktopNext = async () => {
    if (currentPillar < 7) {
      await savePillarAndAdvance(currentPillar + 1);
    } else {
      await handleComplete();
    }
  };

  const handleDesktopPrev = () => {
    if (currentPillar > 0) {
      const prevPillarKey = PILLAR_ORDER[currentPillar - 1]!;
      const savedPrev = savedResponses?.[prevPillarKey] ?? {};
      setResponses(savedPrev);
      setCurrentPillar(currentPillar - 1);
      setCurrentQuestion(0);
    }
  };

  const allCurrentPillarAnswered = questions.every((_, i) => responses[`q${i}`]?.trim());

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Progress bar — sticky top */}
      <div className="sticky top-0 z-10 bg-background/95 px-5 pb-3 pt-4 backdrop-blur-sm sm:px-8">
        <div className="flex justify-between text-xs text-foreground-muted">
          <span>Pilier {currentPillar + 1}/8</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background-overlay">
          <div
            className="h-full rounded-full transition-all duration-slow ease-out"
            style={{ width: `${overallProgress}%`, backgroundColor: pillarColor }}
          />
        </div>
        {/* Pillar dots for quick navigation */}
        <div className="mt-2 flex justify-center gap-1.5">
          {PILLAR_ORDER.map((p, i) => {
            const isAnswered = savedResponses?.[p] && Object.keys(savedResponses[p]).length > 0;
            const isCurrent = i === currentPillar;
            return (
              <button
                key={p}
                onClick={() => {
                  const savedP = savedResponses?.[p] ?? {};
                  setResponses(savedP);
                  setCurrentPillar(i);
                  setCurrentQuestion(0);
                }}
                className={`h-2 rounded-full transition-all ${
                  isCurrent ? "w-6" : "w-2"
                }`}
                style={{
                  backgroundColor: isCurrent
                    ? pillarColor
                    : isAnswered
                      ? `color-mix(in oklch, ${PILLAR_COLORS[p]} 50%, transparent)`
                      : "var(--color-border-subtle)",
                }}
                aria-label={`Pilier ${p.toUpperCase()} — ${PILLAR_NAMES[p]}`}
              />
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-6 sm:px-8">
        {/* Pillar watermark (mobile) */}
        <div
          className="pointer-events-none fixed right-4 top-20 select-none text-[120px] font-black leading-none opacity-[0.03] sm:hidden"
          style={{ color: pillarColor }}
        >
          {pillar.toUpperCase()}
        </div>

        {/* Pillar header */}
        <div className="mb-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              backgroundColor: `color-mix(in oklch, ${pillarColor} 15%, transparent)`,
              color: pillarColor,
            }}
          >
            {pillar.toUpperCase()} — {PILLAR_NAMES[pillar]}
          </span>
          <h1 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">
            {PILLAR_HEADLINE[pillar]}
          </h1>
        </div>

        {/* Desktop: all questions */}
        <div className="hidden space-y-6 sm:block">
          {questions.map((question, i) => (
            <div key={i}>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {question}
              </label>
              <textarea
                value={responses[`q${i}`] ?? ""}
                onChange={(e) => setResponses({ ...responses, [`q${i}`]: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Votre reponse..."
              />
            </div>
          ))}
        </div>

        {/* Mobile: one question at a time */}
        <div className="flex flex-1 flex-col sm:hidden">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
            Question {currentQuestion + 1}/{questions.length}
          </p>
          <label className="mb-4 block text-base font-medium leading-relaxed text-foreground">
            {currentQ}
          </label>
          <textarea
            value={currentAnswer}
            onChange={(e) => setResponses({ ...responses, [`q${currentQuestion}`]: e.target.value })}
            rows={5}
            className="w-full flex-1 rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Votre reponse..."
            style={{ minHeight: "120px" }}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Navigation — sticky bottom on mobile */}
      <div className="sticky bottom-0 border-t border-border-subtle bg-background/95 px-5 py-4 backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          {/* Desktop nav */}
          <div className="hidden sm:flex sm:w-full sm:justify-between">
            <button
              onClick={handleDesktopPrev}
              disabled={currentPillar === 0}
              className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background-overlay disabled:opacity-30"
            >
              Precedent
            </button>
            <button
              onClick={handleDesktopNext}
              disabled={!allCurrentPillarAnswered || advanceMutation.isPending || completeMutation.isPending}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {completeMutation.isPending
                ? "Calcul du score..."
                : currentPillar < 7
                  ? "Suivant"
                  : "Voir mon score"}
            </button>
          </div>

          {/* Mobile nav */}
          <div className="flex w-full items-center justify-between sm:hidden">
            <button
              onClick={handleMobilePrev}
              disabled={currentPillar === 0 && currentQuestion === 0}
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground disabled:opacity-30"
            >
              Prec.
            </button>
            <span className="text-xs text-foreground-muted">
              {currentPillar * 3 + currentQuestion + 1}/24
            </span>
            <button
              onClick={handleMobileNext}
              disabled={!currentAnswer?.trim() || advanceMutation.isPending || completeMutation.isPending}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {completeMutation.isPending
                ? "Calcul..."
                : currentPillar === 7 && currentQuestion === 2
                  ? "Score"
                  : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
