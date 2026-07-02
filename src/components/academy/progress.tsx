"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Progression Académie — localStorage SEUL, par navigateur (WP-020).
 *
 * Honnêteté assumée : il n'existe pas de table de progression cette vague
 * (résidu documenté au board — l'Enrollment legacy n'est pas porté). La
 * progression vit donc sur CET appareil : elle ne suit pas le compte, ne se
 * synchronise pas, et l'UI le dit en clair. Zéro donnée inventée : tant que
 * localStorage n'est pas lu (SSR, 1er rendu), on n'affiche rien plutôt
 * qu'un « 0/4 » présumé.
 */

const STORAGE_KEY = "lafusee.academie.progress.v1";

/** { [moduleSlug]: { [lessonSlug]: ISO date de complétion } } */
type ProgressMap = Record<string, Record<string, string>>;

function readProgress(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: ProgressMap = {};
    for (const [moduleSlug, lessons] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof lessons !== "object" || lessons === null || Array.isArray(lessons)) continue;
      const clean: Record<string, string> = {};
      for (const [lessonSlug, doneAt] of Object.entries(lessons as Record<string, unknown>)) {
        if (typeof doneAt === "string") clean[lessonSlug] = doneAt;
      }
      out[moduleSlug] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

function writeProgress(map: ProgressMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // stockage indisponible (navigation privée…) — la progression reste en mémoire de page.
  }
}

function useAcademyProgress() {
  const [progress, setProgress] = useState<ProgressMap | null>(null); // null = pas encore lu

  useEffect(() => {
    setProgress(readProgress());
  }, []);

  const toggle = useCallback((moduleSlug: string, lessonSlug: string) => {
    setProgress((prev) => {
      const base = prev ?? readProgress();
      const lessons = { ...(base[moduleSlug] ?? {}) };
      if (lessons[lessonSlug]) delete lessons[lessonSlug];
      else lessons[lessonSlug] = new Date().toISOString();
      const next = { ...base, [moduleSlug]: lessons };
      writeProgress(next);
      return next;
    });
  }, []);

  return { progress, toggle };
}

/**
 * Bouton « Marquer comme terminée » d'une page leçon. Tant que localStorage
 * n'est pas lu, il rend un état neutre désactivé (pas de flash mensonger).
 */
export function LessonProgressButton({
  moduleSlug,
  lessonSlug,
}: {
  moduleSlug: string;
  lessonSlug: string;
}) {
  const { progress, toggle } = useAcademyProgress();
  const ready = progress !== null;
  const doneAt = progress?.[moduleSlug]?.[lessonSlug];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!ready}
        onClick={() => toggle(moduleSlug, lessonSlug)}
        className={
          doneAt
            ? "inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/15 disabled:opacity-50 [&_svg]:size-4"
            : "inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral/90 disabled:opacity-50 [&_svg]:size-4"
        }
      >
        {doneAt ? (
          <>
            <RotateCcw aria-hidden /> Terminée — marquer à revoir
          </>
        ) : (
          <>
            <CheckCircle2 aria-hidden /> Marquer comme terminée
          </>
        )}
      </button>
      <p className="text-xs text-smoke-2">
        Progression enregistrée sur cet appareil uniquement (pas de compte de suivi cette
        vague).
      </p>
    </div>
  );
}

/** Coche de complétion d'une ligne de leçon (liste du module). Rien tant que non lu. */
export function LessonDoneMark({
  moduleSlug,
  lessonSlug,
}: {
  moduleSlug: string;
  lessonSlug: string;
}) {
  const { progress } = useAcademyProgress();
  if (!progress?.[moduleSlug]?.[lessonSlug]) return null;
  return (
    <Badge variant="gold">
      <CheckCircle2 aria-hidden />
      Terminée
    </Badge>
  );
}

/**
 * Compteur de progression d'un module (cartes de l'index). `lessonSlugs` =
 * les leçons OUVRABLES du module — les leçons « en cours de migration » ne
 * comptent pas dans le dénominateur.
 */
export function ModuleProgressBadge({
  moduleSlug,
  lessonSlugs,
}: {
  moduleSlug: string;
  lessonSlugs: readonly string[];
}) {
  const { progress } = useAcademyProgress();
  if (progress === null || lessonSlugs.length === 0) return null;
  const done = lessonSlugs.filter((slug) => progress[moduleSlug]?.[slug]).length;
  if (done === 0) return null;
  return (
    <Badge variant={done === lessonSlugs.length ? "gold" : "inverse"}>
      {done === lessonSlugs.length ? <CheckCircle2 aria-hidden /> : null}
      {done}/{lessonSlugs.length} terminée{done > 1 ? "s" : ""}
    </Badge>
  );
}
