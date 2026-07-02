import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, GraduationCap } from "lucide-react";
import { readSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import {
  ACADEMY_LEVEL_LABELS,
  ACADEMY_MODULES,
  availableLessons,
  moduleLessonStats,
} from "@/components/academy/content";
import { ModuleProgressBadge } from "@/components/academy/progress";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Académie" };

/**
 * L'Académie (/studio/academie) — WP-020, port du cluster « apprendre » du
 * portail créateur legacy (learn/adve, learn/drivers, learn/cases) + catalogue
 * des 4 cours réellement seedés (legacy/prisma/seed.ts §16).
 *
 * Honnêteté : les modules dont le corps de leçon n'a jamais existé en
 * code/seed s'affichent comme thèmes « en cours de migration » — rien n'est
 * rédigé à leur place. Progression = localStorage par appareil (pas de table
 * cette vague, résidu documenté au board).
 *
 * Garde : /studio est hors matcher middleware — session vérifiée ici.
 */
export default async function AcademiePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/studio/academie");

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Studio créateur</p>
        <h1 className="font-display text-3xl font-semibold">L&apos;Académie</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          La formation des créateurs de la Guilde : la méthode ADVE→RTIS, les drivers par
          canal et des cas d&apos;école complets. Le contenu vient du programme pédagogique
          réel de La Fusée — les leçons dont le support n&apos;a pas encore été migré sont
          affichées comme telles, jamais improvisées.
        </p>
        <p className="text-xs text-smoke-2">
          Votre progression est enregistrée sur cet appareil (navigateur) uniquement — le
          suivi par compte arrivera avec sa table.
        </p>
      </header>

      <Link
        href="/studio"
        className="inline-flex items-center gap-2 text-sm font-medium text-sand transition-colors hover:text-bone [&_svg]:size-4"
      >
        <ArrowLeft aria-hidden /> Retour au Studio
      </Link>

      <section aria-label="Modules de formation" className="grid gap-bento md:grid-cols-2">
        {ACADEMY_MODULES.map((courseModule) => {
          const stats = moduleLessonStats(courseModule);
          const openable = availableLessons(courseModule).map((l) => l.slug);
          const migrating = stats.available === 0;
          return (
            <Link
              key={courseModule.slug}
              href={`/studio/academie/${courseModule.slug}`}
              className="group flex flex-col rounded-lg border border-line bg-ink-2 p-6 transition-colors hover:border-coral/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
                  {courseModule.category}
                </span>
                {courseModule.level ? (
                  <Badge variant="outline">{ACADEMY_LEVEL_LABELS[courseModule.level]}</Badge>
                ) : null}
                {migrating ? <Badge variant="coral">Contenu en cours de migration</Badge> : null}
                <ModuleProgressBadge moduleSlug={courseModule.slug} lessonSlugs={openable} />
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold text-bone">
                {courseModule.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-sand">
                {courseModule.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-smoke-2">
                <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
                  <GraduationCap aria-hidden />
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
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-coral [&_svg]:size-4">
                Ouvrir le module
                <ArrowRight aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
