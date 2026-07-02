import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LinkIcon, Rocket, X } from "lucide-react";
import { BRAND_LEVELS, type BrandLevel } from "@/domain/pillars";
import { DIAGNOSTIC_MAX_SCORE } from "@/domain/diagnostic";
import {
  COMPOSITE_MAX_SCORE,
  LEVEL_DEFINITIONS,
  LEVEL_UPPER_BOUNDS_200,
  PILLAR_MAX_SCORE,
  STRUCTURAL_WEIGHTS,
  nextLevel,
} from "@/domain/scoring";
import { resolveSharedRapport } from "@/server/share";
import type { LeadReportField } from "@/server/funnel";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/components/pillars/print-button";

/**
 * /intake/rapport/[token] — le rapport ADVE COMPLET du diagnostic (port de
 * legacy //intake/[token]/result, version déterministe v7) : score global +
 * par pilier, constat CHAMP PAR CHAMP (déclaré vs vide — uniquement les
 * données du lead, zéro analyse inventée), 3 actions, méthode expliquée
 * depuis les constantes canon, CTA conversion. La même page est la version
 * imprimable (pattern /app/oracle/print : « le PDF, c'est l'impression
 * navigateur ») — chrome public masqué par le print CSS de bas de page.
 * Token JWT 30 j (src/server/share.ts) ; lien mort → page morte propre.
 */
export const dynamic = "force-dynamic";

/** Une résolution par requête, partagée entre generateMetadata et la page. */
const getSharedRapport = cache(resolveSharedRapport);

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const report = await getSharedRapport(token);
  if (!report) {
    return { title: "Rapport indisponible", robots: { index: false } };
  }
  return {
    title: `Rapport ADVE — ${report.lead.brandName}`,
    description: `Rapport complet du diagnostic ADVE de ${report.lead.brandName} : score, constat champ par champ, prochaines actions.`,
    robots: { index: false }, // rapport personnel lié à un lead — hors index
  };
}

// ── Échelle des paliers /200 — dérivée des bornes canon, rien d'inventé ──

function levelRange(level: BrandLevel): string {
  const levels = BRAND_LEVELS;
  const index = levels.indexOf(level);
  if (level === "ICONE") return `> ${LEVEL_UPPER_BOUNDS_200.CULTE}`;
  const upper = LEVEL_UPPER_BOUNDS_200[level];
  const prev = levels[index - 1];
  const lower = prev && prev !== "ICONE" ? LEVEL_UPPER_BOUNDS_200[prev as Exclude<BrandLevel, "ICONE">] : 0;
  return `${lower} – ${upper}`;
}

// ── Fragments de rendu (document blanc, imprimable) ────────────────────

function PillarBar({ score }: { score: number }) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/8">
      <div className="h-full rounded-full bg-coral" style={{ width: `${score}%` }} />
    </div>
  );
}

function FieldAnswer({ answer }: { answer: string | string[] }) {
  if (Array.isArray(answer)) {
    return (
      <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-graphite">
        {answer.map((item) => (
          <li key={item} className="relative pl-4 before:absolute before:left-0 before:font-bold before:text-coral before:content-['–']">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  return <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-graphite">{answer}</p>;
}

function FieldRow({ field }: { field: LeadReportField }) {
  if (field.filled) {
    return (
      <div className="break-inside-avoid border-b border-ink/8 py-3 last:border-b-0">
        <p className="flex items-baseline gap-2 text-sm font-semibold text-ink">
          <Check className="size-4 shrink-0 self-center text-success" aria-hidden="true" />
          {field.label}
          {field.needsHuman ? (
            <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-smoke">
              décision fondateur
            </span>
          ) : null}
        </p>
        {field.answer !== undefined ? (
          <div className="pl-6">
            <FieldAnswer answer={field.answer} />
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className="break-inside-avoid border-b border-ink/8 py-3 last:border-b-0">
      <p className="flex items-baseline gap-2 text-sm font-semibold text-smoke">
        <X className="size-4 shrink-0 self-center text-coral-deep" aria-hidden="true" />
        {field.label}
        <span className="rounded-full border border-coral/30 bg-coral/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-coral-deep">
          à compléter
        </span>
      </p>
      <p className="mt-1 pl-6 text-sm leading-relaxed text-smoke">{field.description}</p>
    </div>
  );
}

export default async function RapportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getSharedRapport(token);

  // ── Lien mort : page morte propre ────────────────────────────────────
  if (!report) {
    return (
      <div className="bg-bone">
        <div className="mx-auto max-w-2xl px-gutter py-20 sm:py-28">
          <EmptyState
            tone="light"
            icon={<LinkIcon />}
            title="Ce rapport n'est plus accessible"
            description="Les liens de rapport sont valables 30 jours après leur génération. Celui-ci a expiré ou a été altéré — relancez un diagnostic gratuit pour obtenir un rapport à jour."
          >
            <Link href="/intake" className={buttonVariants({ size: "md" })}>
              Refaire le diagnostic gratuit <ArrowRight aria-hidden="true" />
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const { lead, secteur, countryName, diagnostic, pillars } = report;
  const levelDef = LEVEL_DEFINITIONS[diagnostic.level];
  const next = nextLevel(diagnostic.level);
  const converted = lead.status === "CONVERTED";
  const meta = [secteur, countryName, `diagnostic du ${DATE_FORMAT.format(lead.createdAt)}`].filter(
    Boolean,
  );
  const totalFields = pillars.reduce((sum, p) => sum + p.fields.length, 0);
  const filledFields = pillars.reduce((sum, p) => sum + p.score.filled.length, 0);

  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-3xl space-y-6 px-gutter py-10 print:max-w-none print:space-y-0 print:px-0 print:py-0 sm:py-14">
        {/* Toolbar écran — jamais imprimée */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            href={`/intake/resultat/${lead.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Retour au résultat
          </Link>
          <PrintButton />
        </div>

        <article className="rounded-lg bg-white p-8 text-ink shadow-card print:rounded-none print:p-0 print:shadow-none sm:p-10">
          {/* ── En-tête brandé ─────────────────────────────────────────── */}
          <div className="border-b-2 border-coral pb-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="eyebrow text-coral">
                La Fusée<span className="text-ink"> · by UPgraders</span>
              </p>
              <p className="font-mono text-xs text-smoke">{DATE_FORMAT.format(lead.createdAt)}</p>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Rapport ADVE — {lead.brandName}
            </h1>
            {meta.length > 0 ? <p className="mt-2 text-sm text-smoke">{meta.join(" · ")}</p> : null}
            <p className="mt-3 text-sm leading-relaxed text-graphite">
              Constat déterministe établi UNIQUEMENT depuis les réponses déclarées au diagnostic
              — chaque force cite un champ rempli, chaque angle mort cite un champ vide. Aucune
              analyse inventée.
            </p>
          </div>

          {/* ── 1. Score global + palier ───────────────────────────────── */}
          <section className="break-inside-avoid border-b border-ink/10 py-6">
            <p className="eyebrow text-smoke">1 · Score du socle ADVE</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-4">
              <p className="font-display text-6xl font-semibold leading-none text-ink">
                {diagnostic.score}
                <span className="text-2xl text-smoke"> / {DIAGNOSTIC_MAX_SCORE}</span>
              </p>
              <div className="min-w-56 flex-1 space-y-1.5">
                <p className="text-sm font-semibold text-ink">
                  Palier projeté : <span className="text-coral">{levelDef.label}</span> —{" "}
                  {diagnostic.levelLabel}
                </p>
                <p className="text-sm leading-relaxed text-graphite">{levelDef.signals}</p>
                {next ? (
                  <p className="text-sm text-smoke">
                    Prochain palier : <span className="font-semibold text-ink">{LEVEL_DEFINITIONS[next].label}</span>{" "}
                    — {LEVEL_DEFINITIONS[next].tagline.toLowerCase()}.
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-4 font-mono text-xs text-smoke">
              {filledFields}/{totalFields} champs du socle renseignés · 4 piliers × {PILLAR_MAX_SCORE}{" "}
              points
            </p>
          </section>

          {/* ── 2. Barème par pilier ───────────────────────────────────── */}
          <section className="break-inside-avoid border-b border-ink/10 py-6">
            <p className="eyebrow text-smoke">2 · Détail par pilier</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {pillars.map((pillar) => (
                <div key={pillar.key} className="rounded-md border border-ink/10 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      <span className="text-coral">{pillar.key}</span> · {pillar.label}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-graphite">
                      {pillar.score.score}/100
                    </p>
                  </div>
                  <PillarBar score={pillar.score.score} />
                  <p className="mt-2 text-xs text-smoke">
                    {pillar.score.filled.length}/{pillar.fields.length} champs renseignés ·{" "}
                    {pillar.score.score25}/{PILLAR_MAX_SCORE} pts au composite
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 3. Synthèse factuelle : forces / angles morts ──────────── */}
          <section className="border-b border-ink/10 py-6">
            <p className="eyebrow text-smoke">3 · Synthèse factuelle</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div className="break-inside-avoid">
                <h2 className="font-display text-lg font-semibold text-ink">Vos forces</h2>
                {diagnostic.forces.length > 0 ? (
                  <ul className="mt-3 space-y-2.5">
                    {diagnostic.forces.map((force) => (
                      <li key={force} className="flex items-start gap-2.5 text-sm leading-relaxed text-graphite">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                        {force}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-smoke">
                    Aucune force constatée pour l&apos;instant — le socle est encore à poser.
                    Chaque champ déclaré deviendra un actif mesurable.
                  </p>
                )}
              </div>
              <div className="break-inside-avoid">
                <h2 className="font-display text-lg font-semibold text-ink">Vos angles morts</h2>
                {diagnostic.faiblesses.length > 0 ? (
                  <ul className="mt-3 space-y-2.5">
                    {diagnostic.faiblesses.map((faiblesse) => (
                      <li key={faiblesse} className="flex items-start gap-2.5 text-sm leading-relaxed text-graphite">
                        <X className="mt-0.5 size-4 shrink-0 text-coral-deep" aria-hidden="true" />
                        {faiblesse}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-smoke">
                    Aucun champ vide sur le socle ADVE — la suite se joue sur les piliers dérivés
                    (RTIS) et l&apos;exécution.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── 4. Constat champ par champ ─────────────────────────────── */}
          <section className="border-b border-ink/10 py-6">
            <p className="eyebrow text-smoke">4 · Constat champ par champ</p>
            <p className="mt-2 text-sm leading-relaxed text-graphite">
              Les {totalFields} champs du socle ADVE, dans l&apos;ordre de la cascade A → D → V → E :
              ce que vous avez déclaré, et ce qui manque encore.
            </p>
            <div className="mt-4 space-y-6">
              {pillars.map((pillar) => (
                <div key={pillar.key} className="rounded-md border border-ink/10 p-5">
                  <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
                    <h2 className="font-display text-lg font-semibold text-ink">
                      <span className="text-coral">{pillar.key}</span> · {pillar.label}
                    </h2>
                    <p className="font-mono text-xs tabular-nums text-smoke">
                      {pillar.score.filled.length}/{pillar.fields.length} champs · {pillar.score.score}/100
                    </p>
                  </div>
                  <div>
                    {pillar.fields.map((field) => (
                      <FieldRow key={field.id} field={field} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 5. Les 3 prochaines actions ────────────────────────────── */}
          <section className="break-inside-avoid border-b border-ink/10 py-6">
            <p className="eyebrow text-smoke">5 · Par où commencer</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-ink">
              Vos 3 prochaines actions
            </h2>
            <ol className="mt-4 space-y-3">
              {diagnostic.next3Actions.map((action, i) => (
                <li key={action} className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-coral/12 font-mono text-sm font-bold text-coral-deep">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm leading-relaxed text-graphite">{action}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ── 6. La méthode — comment ce rapport est calculé ─────────── */}
          <section className="break-inside-avoid py-6">
            <p className="eyebrow text-smoke">6 · La méthode</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-ink">
              Comment ce rapport est calculé
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-graphite">
              <p>
                Le diagnostic mesure le <strong className="font-semibold text-ink">socle ADVE</strong> :
                Authenticité (qui vous êtes), Distinction (contre qui et pour qui), Valeur (ce que
                vous vendez et à quel prix), Engagement (comment on vous vit). La cascade est
                ordonnée — on ne se différencie pas sans identité, on ne price pas sans
                différenciation.
              </p>
              <p>
                Chaque pilier est noté sur {PILLAR_MAX_SCORE} points, structurellement et sans
                jugement de fond : présence des champs ({STRUCTURAL_WEIGHTS.atoms} pts), listes
                complètes ({STRUCTURAL_WEIGHTS.collections} pts), profondeur des réponses (
                {STRUCTURAL_WEIGHTS.crossRefs} pts). Le score du socle est la somme des 4 piliers
                — sur {DIAGNOSTIC_MAX_SCORE}. Le calcul est{" "}
                <strong className="font-semibold text-ink">100 % déterministe</strong> : mêmes
                réponses, même score, aucune IA dans la boucle.
              </p>
              <p>
                Le palier projette ce socle sur l&apos;échelle complète des marques (
                {COMPOSITE_MAX_SCORE} points : socle + piliers dérivés Risque, Tracking,
                Innovation, Stratégie) :
              </p>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border border-ink/10">
              {BRAND_LEVELS.map((level) => {
                const def = LEVEL_DEFINITIONS[level];
                const current = level === diagnostic.level;
                return (
                  <div
                    key={level}
                    className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-ink/8 px-4 py-2.5 last:border-b-0 ${
                      current ? "bg-coral/8" : ""
                    }`}
                  >
                    <span className="w-24 font-mono text-xs tabular-nums text-smoke">
                      {levelRange(level)}
                    </span>
                    <span className={`text-sm font-semibold ${current ? "text-coral-deep" : "text-ink"}`}>
                      {def.label}
                    </span>
                    <span className="text-sm text-smoke">— {def.tagline}</span>
                    {current ? (
                      <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        vous êtes ici
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <footer className="border-t border-ink/10 pt-6 text-center text-xs leading-relaxed text-smoke">
            Rapport généré depuis les seules réponses déclarées le {DATE_FORMAT.format(lead.createdAt)}
            {" "}— les champs vides sont des constats de vide, jamais des inventions. Lien valable 30
            jours. La Fusée · UPgraders.
          </footer>
        </article>

        {/* ── CTA conversion — jamais imprimé ─────────────────────────── */}
        <div className="rounded-lg bg-ink p-8 text-center text-bone shadow-card print:hidden sm:p-10">
          <span className="inline-flex size-12 items-center justify-center rounded-md bg-coral/15 text-coral">
            <Rocket className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">
            {converted
              ? "Ce diagnostic a déjà son Cockpit."
              : "Transformez ce rapport en plan de vol."}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-sand">
            {converted
              ? "Le socle ADVE de cette marque a été importé dans son espace. Connectez-vous pour le piloter."
              : "Créez votre Cockpit : ces réponses deviennent le socle ADVE de votre marque — rien à re-saisir. Complétez vos angles morts, suivez votre score, débloquez vos livrables."}
          </p>
          <div className="mt-6">
            {converted ? (
              <Link href="/connexion" className={buttonVariants({ size: "md" })}>
                Se connecter à mon espace <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <Link href={`/inscription?lead=${lead.id}`} className={buttonVariants({ size: "md" })}>
                Créer mon Cockpit — gratuit <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Réglages d'impression : marges, fidélité des fonds, chrome public
          masqué (le document n'utilise AUCUN header/footer/nav interne). */}
      <style>{`
        @media print {
          @page { margin: 14mm; }
          body { background: #ffffff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header, footer, nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
