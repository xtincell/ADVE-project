/**
 * retroplan.ts — Rétroplanning d'activités ancré sur T0 (ADR-0120 PR-4b). PUR, déterministe, zéro LLM.
 *
 * « Rétroplanning » = on travaille à rebours depuis la date de lancement (T0) : tout
 * doit être prêt POUR T0. Les activités s'enchaînent dans l'ordre (`order`) ; la somme
 * de leurs durées définit la fenêtre de production qui se termine à T0. Chaque durée est
 * soit FIXÉE (`activity.durationDays`) soit DÉRIVÉE déterministiquement par type — les
 * deux options sont possibles (décision opérateur 2026-06-29).
 *
 * Pur : `computeRetroplan` ne dépend que de ses arguments (le `t0` est injecté).
 */

export interface RetroActivityInput {
  id: string;
  order: number;
  type: string; // ASSET_CREATION | FIELD_ACTION
  durationDays?: number | null; // fixée si renseignée (>0), sinon dérivée
  status?: string | null;
}

export interface RetroActivitySlot {
  id: string;
  order: number;
  durationDays: number;
  /** true si la durée a été dérivée (non fixée par l'opérateur). */
  durationDerived: boolean;
  /** Jours relatifs à T0 (≤ 0 ; -7 = J-7). */
  startOffsetDays: number;
  endOffsetDays: number;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
}

export interface Retroplan {
  t0: string; // ISO date de lancement
  totalDurationDays: number;
  startDate: string; // début de la fenêtre de production (T0 - total)
  slots: RetroActivitySlot[];
}

/** Durées par défaut (jours) par type d'activité — base de la dérivation déterministe. */
export const DEFAULT_ACTIVITY_DURATION_DAYS: Record<string, number> = {
  ASSET_CREATION: 5,
  FIELD_ACTION: 3,
};
const FALLBACK_DURATION_DAYS = 5;

/** Durée d'une activité : FIXÉE si renseignée (>0), sinon DÉRIVÉE par type. PUR. */
export function resolveActivityDurationDays(a: { type?: string | null; durationDays?: number | null }): {
  days: number;
  derived: boolean;
} {
  if (typeof a.durationDays === "number" && a.durationDays > 0) return { days: Math.round(a.durationDays), derived: false };
  const t = (a.type ?? "").toUpperCase();
  return { days: DEFAULT_ACTIVITY_DURATION_DAYS[t] ?? FALLBACK_DURATION_DAYS, derived: true };
}

function addDaysISO(t0: Date, days: number): string {
  const d = new Date(t0.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calcule le rétroplanning : enchaîne les activités (ordre croissant) dans une fenêtre
 * qui SE TERMINE à T0. La 1ère activité commence à T0 - total ; la dernière finit à T0.
 * Les activités annulées sont ignorées. PUR.
 */
export function computeRetroplan(activities: RetroActivityInput[], t0: Date): Retroplan {
  const active = [...activities]
    .filter((a) => (a.status ?? "") !== "CANCELLED")
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const resolved = active.map((a) => ({ a, ...resolveActivityDurationDays(a) }));
  const totalDurationDays = resolved.reduce((sum, r) => sum + r.days, 0);

  let cursorOffset = -totalDurationDays; // début de fenêtre, en jours relatifs à T0
  const slots: RetroActivitySlot[] = resolved.map((r) => {
    const startOffsetDays = cursorOffset;
    const endOffsetDays = cursorOffset + r.days;
    cursorOffset = endOffsetDays;
    return {
      id: r.a.id,
      order: r.a.order,
      durationDays: r.days,
      durationDerived: r.derived,
      startOffsetDays,
      endOffsetDays,
      startDate: addDaysISO(t0, startOffsetDays),
      endDate: addDaysISO(t0, endOffsetDays),
    };
  });

  return {
    t0: t0.toISOString().slice(0, 10),
    totalDurationDays,
    startDate: addDaysISO(t0, -totalDurationDays),
    slots,
  };
}
