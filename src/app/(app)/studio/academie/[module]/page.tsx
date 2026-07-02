import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { readSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import {
  ACADEMY_LEVEL_LABELS,
  CASE_STUDIES,
  LESSON_KIND_LABELS,
  getModule,
  lessonAvailable,
  moduleLessonStats,
} from "@/components/academy/content";
import { LessonDoneMark } from "@/components/academy/progress";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { module: moduleSlug } = await params;
  const courseModule = getModule(moduleSlug);
  return { title: courseModule ? `${courseModule.title} — Académie` : "Académie" };
}

/**
 * Page module (/studio/academie/[module]) — liste des leçons dans l'ordre du
 * programme. Une leçon sans corps legacy s'affiche « à migrer » (non ouvrable) ;
 * un module entièrement sans corps = vitrine du thème réel + EmptyState.
 */
export default async function AcademieModulePage({ params }: PageProps) {
  const session = await readSession();
  const { module: moduleSlug } = await params;
  if (!session) redirect(`/connexion?next=/studio/academie/${moduleSlug}`);

  const courseModule = getModule(moduleSlug);
  if (!courseModule) notFound();

  const stats = moduleLessonStats(courseModule);
  const caseDifficulty = new Map(CASE_STUDIES.map((c) => [c.id, c.difficulty] as const));

  return (
    <div className="space-y-8">
      <Link
        href="/studio/academie"
        className="inline-flex items-center gap-2 text-sm font-medium text-sand transition-colors hover:text-bone [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden /> L&apos;Académie
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
            {courseModule.category}
          </span>
          {courseModule.level ? (
            <Badge variant="outline">{ACADEMY_LEVEL_LABELS[courseModule.level]}</Badge>
          ) : null}
        </div>
        <h1 className="font-display text-3xl font-semibold">{courseModule.title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">{courseModule.description}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-smoke-2">
          <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
            <BookOpen aria-hidden />
            {stats.total} leçon{stats.total > 1 ? "s" : ""}
            {stats.available < stats.total
              ? ` — ${stats.available} disponible${stats.available > 1 ? "s" : ""}`
              : ""}
          </span>
          {courseModule.durationMin ? (
            <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
              <Clock3 aria-hidden />≈ {courseModule.durationMin} min
            </span>
          ) : null}
          {courseModule.pillarFocus ? (
            <span>
              Pilier {courseModule.pillarFocus} — {PILLAR_LABELS[courseModule.pillarFocus]}
            </span>
          ) : null}
        </div>
      </header>

      {stats.available === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="Contenu en cours de migration"
          description="Ce module existe au catalogue réel de l'Académie (seed legacy) mais le corps de ses leçons n'a jamais été versionné — seul le plan ci-dessous l'était. Rien d'inventé : les leçons s'ouvriront quand le contenu réel aura été migré."
        />
      ) : null}

      <ol className="space-y-2.5" aria-label="Leçons du module">
        {courseModule.lessons.map((lesson, index) => {
          const open = lessonAvailable(lesson);
          const difficulty =
            lesson.kind === "etude-de-cas" ? caseDifficulty.get(lesson.slug) : undefined;
          const meta = (
            <span className="mt-0.5 block text-xs text-smoke-2">
              {LESSON_KIND_LABELS[lesson.kind]}
              {difficulty ? ` · ${ACADEMY_LEVEL_LABELS[difficulty]}` : ""}
            </span>
          );
          return (
            <li key={lesson.slug}>
              {open ? (
                <Link
                  href={`/studio/academie/${courseModule.slug}/${lesson.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-2 px-5 py-4 transition-colors hover:border-coral/50"
                >
                  <span className="flex min-w-0 items-start gap-4">
                    <span className="mt-0.5 font-mono text-xs font-bold text-coral">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold text-bone">
                        {lesson.title}
                      </span>
                      {meta}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <LessonDoneMark moduleSlug={courseModule.slug} lessonSlug={lesson.slug} />
                    <ArrowRight
                      aria-hidden
                      className="size-4 text-smoke-2 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line bg-ink-2/50 px-5 py-4">
                  <span className="flex min-w-0 items-start gap-4">
                    <span className="mt-0.5 font-mono text-xs font-bold text-smoke-2">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold text-sand">
                        {lesson.title}
                      </span>
                      {meta}
                    </span>
                  </span>
                  <Badge variant="outline">À migrer</Badge>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-smoke-2">Source du programme : {courseModule.source}.</p>
    </div>
  );
}
