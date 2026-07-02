import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { readSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BRAND_LEVELS, isAdve, type BrandLevel } from "@/domain/pillars";
import {
  COMPOSITE_MAX_SCORE,
  LEVEL_DEFINITIONS,
  LEVEL_UPPER_BOUNDS_200,
  PILLAR_MAX_SCORE,
  STRUCTURAL_WEIGHTS,
} from "@/domain/scoring";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import {
  ACADEMY_LEVEL_LABELS,
  DRIVER_CHANNELS,
  DRIVER_TYPES,
  DRIVER_TYPE_LABELS,
  LESSON_KIND_LABELS,
  PILLAR_TEACHINGS,
  availableLessons,
  getCaseStudy,
  getLesson,
  type DriverType,
  type LessonBlock,
} from "@/components/academy/content";
import { LessonProgressButton } from "@/components/academy/progress";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ module: string; lecon: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { module: moduleSlug, lecon } = await params;
  const found = getLesson(moduleSlug, lecon);
  return {
    title: found ? `${found.lesson.title} — Académie` : "Académie",
  };
}

/**
 * Page leçon (/studio/academie/[module]/[lecon]) — rend les blocs de contenu
 * réels portés du legacy (`components/academy/content.ts`). Le bloc `bareme`
 * est calculé DEPUIS `domain/scoring` (poids 15/7/3, bornes des 6 paliers) —
 * jamais de chiffre recopié. Une leçon sans corps → EmptyState honnête.
 */
export default async function AcademieLeconPage({ params }: PageProps) {
  const session = await readSession();
  const { module: moduleSlug, lecon } = await params;
  if (!session) redirect(`/connexion?next=/studio/academie/${moduleSlug}/${lecon}`);

  const found = getLesson(moduleSlug, lecon);
  if (!found) notFound();
  const { module: courseModule, lesson } = found;

  const openable = availableLessons(courseModule);
  const position = openable.findIndex((l) => l.slug === lesson.slug);
  const previous = position > 0 ? openable[position - 1] : undefined;
  const next = position >= 0 ? openable[position + 1] : undefined;

  return (
    <div className="space-y-8">
      <Link
        href={`/studio/academie/${courseModule.slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-sand transition-colors hover:text-bone [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden /> {courseModule.title}
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="inverse">{LESSON_KIND_LABELS[lesson.kind]}</Badge>
          <span className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
            {courseModule.category}
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold">{lesson.title}</h1>
      </header>

      {lesson.blocks?.length ? (
        <div className="max-w-3xl space-y-6">
          {lesson.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen />}
          title="Contenu en cours de migration"
          description="Le corps de cette leçon n'a jamais été versionné dans l'ancien monde — seul son titre l'était. Rien d'inventé : elle s'ouvrira quand le contenu réel aura été migré."
        />
      )}

      {lesson.blocks?.length ? (
        <footer className="space-y-5 border-t border-line pt-6">
          <LessonProgressButton moduleSlug={courseModule.slug} lessonSlug={lesson.slug} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            {previous ? (
              <Link
                href={`/studio/academie/${courseModule.slug}/${previous.slug}`}
                className="inline-flex items-center gap-2 font-medium text-sand transition-colors hover:text-bone [&_svg]:size-4"
              >
                <ArrowLeft aria-hidden /> {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/studio/academie/${courseModule.slug}/${next.slug}`}
                className="inline-flex items-center gap-2 font-semibold text-coral transition-colors hover:text-coral-hover [&_svg]:size-4"
              >
                {next.title} <ArrowRight aria-hidden />
              </Link>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  );
}

// ── Rendu des blocs ─────────────────────────────────────────────────────

function Block({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "paragraphe":
      return <p className="text-sm leading-relaxed text-sand">{block.text}</p>;
    case "intertitre":
      return <h2 className="font-display pt-2 text-xl font-semibold text-bone">{block.text}</h2>;
    case "liste":
      return (
        <ul className="space-y-2">
          {block.items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-sand">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      );
    case "encadre":
      return (
        <div className="rounded-lg border border-coral/30 bg-coral/5 p-5">
          <h3 className="font-display text-base font-semibold text-coral">{block.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-sand">{block.text}</p>
        </div>
      );
    case "piliers":
      return <PillarsGrid />;
    case "bareme":
      return <ScoreScale />;
    case "canaux":
      return <ChannelsGrid />;
    case "etude-de-cas":
      return <CaseStudyBody caseId={block.caseId} />;
  }
}

// ── Les 8 piliers (contenu porté + labels canon) ───────────────────────

function PillarsGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {PILLAR_TEACHINGS.map((pillar) => (
        <article key={pillar.key} className="rounded-lg border border-line bg-ink-2 p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="font-display flex size-10 shrink-0 items-center justify-center rounded-md bg-coral/12 text-lg font-bold text-coral"
            >
              {pillar.key}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-bone">
                {PILLAR_LABELS[pillar.key]}
              </h3>
              <p className="text-xs text-smoke-2">
                {isAdve(pillar.key) ? "Socle ADVE — déclaré" : "Dérivé RTIS — jamais édité à la main"} ·
                /{PILLAR_MAX_SCORE}
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-md border border-line-soft bg-ink px-3 py-2 text-xs font-medium italic text-sand-2">
            « {pillar.question} »
          </p>
          <p className="mt-3 text-xs leading-relaxed text-sand">{pillar.description}</p>
        </article>
      ))}
    </div>
  );
}

// ── Barème /200 — rendu depuis domain/scoring (canon v7, 6 paliers) ────

const LEVEL_BAND_CLASSES: Record<BrandLevel, string> = {
  LATENT: "bg-ink-4",
  FRAGILE: "bg-smoke",
  ORDINAIRE: "bg-sand",
  FORTE: "bg-info",
  CULTE: "bg-coral",
  ICONE: "bg-gold",
};

/** Bornes réelles [basse, haute] d'un palier sur l'échelle /200. */
function levelBounds(level: BrandLevel): [number, number] {
  const i = BRAND_LEVELS.indexOf(level);
  const lower = i === 0 ? 0 : LEVEL_UPPER_BOUNDS_200[BRAND_LEVELS[i - 1] as Exclude<BrandLevel, "ICONE">] + 1;
  const upper = level === "ICONE" ? COMPOSITE_MAX_SCORE : LEVEL_UPPER_BOUNDS_200[level];
  return [lower, upper];
}

function ScoreScale() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-ink-2 p-5">
        <p className="text-sm leading-relaxed text-sand">
          Chaque pilier est noté sur{" "}
          <span className="font-semibold text-bone">{PILLAR_MAX_SCORE} points</span> selon trois
          axes pondérés : la présence des champs requis (/{STRUCTURAL_WEIGHTS.atoms}), les listes
          au seuil minimal d&apos;items (/{STRUCTURAL_WEIGHTS.collections}) et la profondeur
          au-delà du minimum (/{STRUCTURAL_WEIGHTS.crossRefs}). Le composite — somme des 8
          piliers — donne une note sur{" "}
          <span className="font-semibold text-bone">{COMPOSITE_MAX_SCORE}</span> qui classe la
          marque sur six paliers :
        </p>

        <div className="mt-5">
          <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
            {BRAND_LEVELS.map((level) => {
              const [lower, upper] = levelBounds(level);
              const width = ((upper - (lower === 0 ? 0 : lower - 1)) / COMPOSITE_MAX_SCORE) * 100;
              return (
                <div
                  key={level}
                  className={LEVEL_BAND_CLASSES[level]}
                  style={{ width: `${width}%` }}
                  title={`${LEVEL_DEFINITIONS[level].label} ${lower}–${upper}`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-smoke-2" aria-hidden>
            <span>0</span>
            {BRAND_LEVELS.map((level) => (
              <span key={level}>{levelBounds(level)[1]}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {BRAND_LEVELS.map((level) => {
          const def = LEVEL_DEFINITIONS[level];
          const [lower, upper] = levelBounds(level);
          return (
            <div key={level} className="flex items-start gap-4 rounded-lg border border-line bg-ink-2 p-4">
              <div className="w-24 shrink-0">
                <p className="font-display text-base font-semibold text-bone">{def.label}</p>
                <p className="font-mono text-[11px] text-smoke-2">
                  {level === "ICONE" ? `> ${lower - 1}` : `${lower} – ${upper}`}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-coral">
                  {def.tagline}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-sand">{def.signals}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            step: "1",
            title: "Trois axes par pilier",
            text: `Le moteur mesure ce qui est réellement renseigné : champs requis, listes complètes, profondeur. Pondération ${STRUCTURAL_WEIGHTS.atoms}/${STRUCTURAL_WEIGHTS.collections}/${STRUCTURAL_WEIGHTS.crossRefs}, plafond ${PILLAR_MAX_SCORE} par pilier.`,
          },
          {
            step: "2",
            title: "Composite",
            text: `Les 8 scores s'additionnent en une note sur ${COMPOSITE_MAX_SCORE}. Déterministe : même contenu, même score — aucun jugement d'IA dans le chemin de calcul.`,
          },
          {
            step: "3",
            title: "Palier",
            text: "Le composite classe la marque sur les bornes canon ci-dessus. Plus on monte, plus la bande se resserre : chaque point coûte davantage en approchant de l'apex.",
          },
        ].map((item) => (
          <div key={item.step} className="rounded-lg border border-line bg-ink-2 p-4">
            <p className="font-mono text-xs font-bold text-coral">{item.step}</p>
            <h3 className="font-display mt-2 text-sm font-semibold text-bone">{item.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-sand">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Les 13 canaux (drivers) ─────────────────────────────────────────────

const DRIVER_TYPE_BADGES: Record<DriverType, "inverse" | "outline" | "coral" | "gold"> = {
  DIGITAL: "inverse",
  PHYSICAL: "outline",
  EXPERIENTIAL: "coral",
  MEDIA: "gold",
};

function ChannelsGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DRIVER_TYPES.map((driverType) => {
          const count = DRIVER_CHANNELS.filter((c) => c.driverType === driverType).length;
          return (
            <div key={driverType} className="rounded-lg border border-line bg-ink-2 p-3 text-center">
              <Badge variant={DRIVER_TYPE_BADGES[driverType]}>{DRIVER_TYPE_LABELS[driverType]}</Badge>
              <p className="font-display mt-2 text-lg font-bold text-bone">{count}</p>
              <p className="text-[11px] text-smoke-2">
                {count > 1 ? "canaux" : "canal"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {DRIVER_CHANNELS.map((channel) => (
          <article key={channel.channel} className="rounded-lg border border-line bg-ink-2 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-bone">{channel.label}</h3>
                <p className="font-mono text-[11px] text-smoke-2">{channel.channel}</p>
              </div>
              <Badge variant={DRIVER_TYPE_BADGES[channel.driverType]}>
                {DRIVER_TYPE_LABELS[channel.driverType]}
              </Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-sand">{channel.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

// ── Étude de cas complète ───────────────────────────────────────────────

function CaseStudyBody({ caseId }: { caseId: string }) {
  const caseStudy = getCaseStudy(caseId);
  if (!caseStudy) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{ACADEMY_LEVEL_LABELS[caseStudy.difficulty]}</Badge>
        <span className="text-xs text-smoke-2">{caseStudy.driverType}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {caseStudy.pillars.map((key) => (
          <span
            key={key}
            className="inline-flex items-center rounded-full bg-coral/12 px-2.5 py-0.5 text-[11px] font-semibold text-coral"
          >
            {key} — {PILLAR_LABELS[key]}
          </span>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-sand">{caseStudy.summary}</p>

      <CaseSection heading="Contexte" text={caseStudy.context} />
      <CaseSection heading="Défi" text={caseStudy.challenge} />
      <CaseSection heading="Approche" text={caseStudy.approach} />

      <div className="rounded-lg border border-coral/30 bg-coral/5 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-coral">
          Application ADVE-RTIS
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-sand">{caseStudy.adveApplication}</p>
      </div>

      <div className="rounded-lg border border-gold/25 bg-gold/5 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Résultats</h3>
        <ul className="mt-2 space-y-1.5">
          {caseStudy.results.map((result) => (
            <li key={result} className="flex items-start gap-2.5 text-sm leading-relaxed text-sand">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
              {result}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-smoke-2">
          Enseignements clés
        </h3>
        <ul className="mt-2 space-y-1.5">
          {caseStudy.lessons.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-sand">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-smoke-2">
        Cas d&apos;école pédagogique porté de l&apos;Académie legacy — les chiffres y illustrent
        la méthode, ce ne sont pas des références client d&apos;UPgraders.
      </p>
    </div>
  );
}

function CaseSection({ heading, text }: { heading: string; text: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-smoke-2">{heading}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-sand">{text}</p>
    </div>
  );
}
