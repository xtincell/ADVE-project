// ============================================================================
// MODULE M35 — Quick Intake: Short Method (Text Analysis)
// Paste brand description text → AI extracts ADVE-RTIS data → Score
// ROUTE: /intake/[token]/short
// ============================================================================

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { FileText, Rocket, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { IntakeProcessingScreen } from "@/components/intake/intake-processing-screen";
import { useIntakeProcessingWatch, failureReasonKey } from "@/components/intake/use-intake-processing-watch";
import { useT } from "@/lib/i18n/use-t";

// i18n keys — resolved via t() at render time
const TIP_KEYS = [
  "intake.short.tip1",
  "intake.short.tip2",
  "intake.short.tip3",
  "intake.short.tip4",
];

export default function ShortIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const { data: intake, isLoading } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // F1 async : le serveur rend la main immédiatement ({ status: "PROCESSING" }),
  // le hook sonde getByToken jusqu'à l'état terminal RÉEL — redirection sur
  // COMPLETED uniquement, message honnête sur FAILED (retry sans rien perdre).
  const { watching, startWatching } = useIntakeProcessingWatch(token, (outcome) => {
    if (outcome.status === "COMPLETED") {
      router.push(`/intake/${token}/result`);
      return;
    }
    setError(t(failureReasonKey(outcome.reason)));
  });

  const processShortMutation = trpc.quickIntake.processShort.useMutation({
    onSuccess: (data) => {
      if (data.status === "PROCESSING") startWatching();
    },
    onError: (err) => setError(err.message),
  });

  // Un retour sur la page pendant qu'un traitement tourne (refresh, lien
  // rouvert) reprend le suivi au lieu de représenter le formulaire.
  useEffect(() => {
    if (intake?.status === "PROCESSING" && !watching) startWatching();
  }, [intake?.status, watching, startWatching]);

  if (isLoading) {
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

  if (intake.status === "COMPLETED" || intake.status === "CONVERTED") {
    router.push(`/intake/${token}/result`);
    return null;
  }

  if (watching || processShortMutation.isPending) {
    return (
      <IntakeProcessingScreen
        companyName={intake.companyName}
        isPending
        errorMessage={error || undefined}
      />
    );
  }

  const handleSubmit = () => {
    if (text.trim().length < 100) {
      setError(t("intake.short.error.minLength"));
      return;
    }
    setError("");
    processShortMutation.mutate({ token, text: text.trim() });
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:px-8">
        {/* Back link */}
        <button
          onClick={() => router.push("/intake")}
          className="mb-6 flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("intake.short.back")}
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            {t("intake.short.title")} <AiBadge />
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            {t("intake.short.subtitle.before")} <span className="font-semibold text-primary">{intake.companyName}</span> {t("intake.short.subtitle.after")}
          </p>
        </div>

        {/* Tips */}
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">{t("intake.short.tipsTitle")}</p>
          <ul className="space-y-1.5">
            {TIP_KEYS.map((tipKey) => (
              <li key={tipKey} className="flex items-start gap-2 text-sm text-foreground-secondary">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {t(tipKey)}
              </li>
            ))}
          </ul>
        </div>

        {/* Text area */}
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-foreground">
            {t("intake.short.label")}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder={t("intake.short.placeholder")}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-foreground-muted">
            <span>{t("intake.short.words").replace("{count}", String(wordCount))}</span>
            <span className={text.length < 100 ? "text-destructive" : "text-success"}>
              {text.length < 100
                ? t("intake.short.charsRemaining").replace("{count}", String(100 - text.length))
                : t("intake.short.lengthOk")}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="sticky bottom-4 mt-6 sm:static sm:bottom-auto">
          <button
            onClick={handleSubmit}
            disabled={processShortMutation.isPending || text.trim().length < 100}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover disabled:opacity-50 sm:py-3 sm:shadow-none"
          >
            {processShortMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {t("intake.short.analyzing")}
              </span>
            ) : (
              t("intake.short.submit")
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
