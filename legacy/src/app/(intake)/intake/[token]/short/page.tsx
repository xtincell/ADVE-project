// ============================================================================
// MODULE M35 — Quick Intake: Short Method (Text Analysis)
// Paste brand description text → AI extracts ADVE-RTIS data → Score
// ROUTE: /intake/[token]/short
// ============================================================================

"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { FileText, Rocket, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";

const PLACEHOLDER_TEXT = `Exemple : Notre entreprise SARL XYZ a ete fondee en 2018 par Marie Ndongo a Douala. Nous vendons des produits cosmetiques bio fabriques localement. Notre positionnement est premium, cible les femmes de 25-45 ans urbaines. Nous avons une communaute Instagram de 15k abonnes tres engages. Notre chiffre d'affaires est de 50M FCFA/an avec un taux de fidelisation de 40%. Nos principaux concurrents sont ABC Cosmetiques et Beaute Plus. Notre vision est de devenir la marque de reference en cosmetique naturelle en Afrique centrale d'ici 2028...`;

const TIPS = [
  "Votre page 'A propos' ou votre pitch deck",
  "Un brief marketing ou un document de positionnement",
  "Une description libre de votre marque, vos produits, vos clients",
  "Plus le texte est riche et detaille, plus le diagnostic sera precis",
];

export default function ShortIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const { data: intake, isLoading } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const processShortMutation = trpc.quickIntake.processShort.useMutation({
    onSuccess: () => {
      router.push(`/intake/${token}/result`);
    },
    onError: (err) => setError(err.message),
  });

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
        <h1 className="text-2xl font-bold text-destructive">Diagnostic introuvable</h1>
        <p className="mt-2 text-foreground-muted">Ce lien est invalide ou a expire.</p>
      </main>
    );
  }

  if (intake.status === "COMPLETED" || intake.status === "CONVERTED") {
    router.push(`/intake/${token}/result`);
    return null;
  }

  const handleSubmit = () => {
    if (text.trim().length < 100) {
      setError("Veuillez fournir un texte d'au moins 100 caracteres pour un diagnostic pertinent.");
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
          Changer de methode
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            Analyse de texte <AiBadge />
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            Collez un texte qui decrit <span className="font-semibold text-primary">{intake.companyName}</span> et l'IA extraira les informations ADVE-RTIS.
          </p>
        </div>

        {/* Tips */}
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Quel texte coller ?</p>
          <ul className="space-y-1.5">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Text area */}
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Decrivez votre marque
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder={PLACEHOLDER_TEXT}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-foreground-muted">
            <span>{wordCount} mots</span>
            <span className={text.length < 100 ? "text-destructive" : "text-success"}>
              {text.length < 100 ? `${100 - text.length} caracteres minimum restants` : "Longueur suffisante"}
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
                Analyse en cours... (30-60 sec)
              </span>
            ) : (
              "Analyser et generer le score"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
