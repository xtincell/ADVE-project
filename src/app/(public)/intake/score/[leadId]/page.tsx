import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Rocket } from "lucide-react";
import { ADVE_PILLARS } from "@/domain/pillars";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import { DIAGNOSTIC_MAX_SCORE } from "@/domain/diagnostic";
import { LEVEL_DEFINITIONS } from "@/domain/scoring";
import { getLeadDiagnostic } from "@/server/funnel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

/**
 * /intake/score/[leadId] — la variante PARTAGEABLE du résultat de diagnostic
 * (l'atterrissage du « score » legacy, recâblé sur le modèle v7 : le modèle
 * le permet — `getLeadDiagnostic` recalcule le diagnostic par id de lead).
 * Différence avec /intake/resultat/[leadId] (page de conversion du lead) :
 * ici AUCUNE donnée de contact, pas de CTA de conversion du lead — juste le
 * score, le palier, le détail par pilier, et l'invitation à mesurer SA
 * marque. Méta OG dédiées pour les aperçus WhatsApp/réseaux. Lien mort →
 * redirection propre vers la page de référence /intake/score.
 */
export const dynamic = "force-dynamic";

/** Une lecture DB par requête, partagée entre generateMetadata et la page. */
const getSharedDiagnostic = cache(getLeadDiagnostic);

const HIGH_LEVELS = new Set(["FORTE", "CULTE", "ICONE"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leadId: string }>;
}): Promise<Metadata> {
  const { leadId } = await params;
  const result = await getSharedDiagnostic(leadId);
  if (!result) {
    return { title: "Score introuvable", robots: { index: false } };
  }
  const { lead, diagnostic } = result;
  const levelDef = LEVEL_DEFINITIONS[diagnostic.level];
  const title = `${lead.brandName} — ${diagnostic.score}/${DIAGNOSTIC_MAX_SCORE} au diagnostic ADVE`;
  const description = `Palier projeté : ${levelDef.label} — ${levelDef.tagline}. Diagnostic du socle de marque par La Fusée (UPgraders). Mesurez la vôtre en 15 minutes, gratuitement.`;
  return {
    title,
    description,
    robots: { index: false }, // page liée à un lead — partageable, hors index
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

function ScoreGauge({ score }: { score: number }) {
  const deg = Math.max(0, Math.min(DIAGNOSTIC_MAX_SCORE, score)) * (360 / DIAGNOSTIC_MAX_SCORE);
  return (
    <div
      className="relative size-48 shrink-0 rounded-full sm:size-56"
      style={{
        background: `conic-gradient(var(--color-coral) ${deg}deg, rgba(255, 255, 255, 0.09) ${deg}deg)`,
      }}
      role="img"
      aria-label={`Score du socle ADVE : ${score} sur ${DIAGNOSTIC_MAX_SCORE}`}
    >
      <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full bg-ink-2">
        <span className="font-display text-6xl font-semibold leading-none text-bone">
          {score}
        </span>
        <span className="mt-1 text-sm font-medium text-sand">/ {DIAGNOSTIC_MAX_SCORE}</span>
      </div>
    </div>
  );
}

export default async function ScorePartagePage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const result = await getSharedDiagnostic(leadId);
  // Lien de partage mort → atterrissage sur la référence du score, qui
  // explique l'échelle et propose de lancer son propre diagnostic.
  if (!result) redirect("/intake/score");

  const { lead, secteur, countryName, diagnostic } = result;
  const levelDef = LEVEL_DEFINITIONS[diagnostic.level];
  const meta = [secteur, countryName].filter(Boolean);

  return (
    <div className="bg-bone">
      {/* ── La carte de score — panda sombre ──────────────────────────── */}
      <section className="texture-geo bg-ink text-bone">
        <div className="mx-auto max-w-page px-gutter py-14 sm:py-20">
          <p className="eyebrow text-coral">Score partagé · diagnostic ADVE</p>
          <h1 className="font-display mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            {lead.brandName}
          </h1>
          {meta.length > 0 ? (
            <p className="mt-2 text-sm text-sand">{meta.join(" · ")}</p>
          ) : null}

          <div className="mt-10 flex flex-col items-start gap-10 sm:flex-row sm:items-center">
            <ScoreGauge score={diagnostic.score} />
            <div className="max-w-xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={HIGH_LEVELS.has(diagnostic.level) ? "gold" : "coral"}>
                  Palier projeté · {levelDef.label}
                </Badge>
                <span className="text-sm text-sand">{diagnostic.levelLabel}</span>
              </div>
              <p className="text-base leading-relaxed text-sand-2">{levelDef.signals}</p>
              <p className="font-mono text-xs leading-relaxed text-smoke-2">
                ↳ score structurel déterministe du socle ADVE, mesuré le{" "}
                {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
                  lead.createdAt,
                )}{" "}
                ·{" "}
                <Link
                  href="/intake/score"
                  className="text-sand transition-colors hover:text-coral"
                >
                  comprendre le score →
                </Link>
              </p>
            </div>
          </div>

          {/* Détail par pilier — les 4 barres du socle */}
          <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
            {ADVE_PILLARS.map((key) => {
              const p = diagnostic.byPillar[key];
              return (
                <div key={key} className="rounded-lg border border-line bg-ink-2 p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-sand-2">
                      <span className="text-coral">{key}</span> · {PILLAR_LABELS[key]}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-sand">{p.score}/100</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-coral"
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA — mesurer SA marque ───────────────────────────────────── */}
      <section className="mx-auto max-w-page px-gutter py-14 text-center sm:py-20">
        <span className="inline-flex size-12 items-center justify-center rounded-md bg-coral/12 text-coral">
          <Rocket className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-display mx-auto mt-5 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Et votre marque, <span className="text-coral">elle décolle</span> ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-graphite">
          Même diagnostic, même moteur : 15 minutes, chaque champ optionnel,
          score et plan d&apos;action immédiats.
        </p>
        <div className="mt-7">
          <Link href="/intake" className={buttonVariants({ size: "lg" })}>
            Mesurer ma marque gratuitement <ArrowRight />
          </Link>
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-smoke">
          gratuit · sans engagement · confidentiel
        </p>
      </section>
    </div>
  );
}
