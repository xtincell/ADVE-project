/**
 * Sprint K — Imhotep cohort-aware training recommendations.
 *
 * Pour un creator donné, identifie les peers (même bucket + même tier
 * range) qui ont déjà complété des cours et ont vu leur avgScore monter.
 * Pondère les cours par le score-lift médian observé sur la cohorte.
 *
 * Méthode :
 *  1. Resolve cohort = creators avec même bucket + même tier ± 1
 *  2. Pour chaque cours, calcule score-lift = (avgScore après completion
 *     d'enrollment > avgScore mean cohort).
 *  3. Retourne courseId → cohortLift mapping (used by recommendTraining
 *     to boost expectedScoreLift quand peer-validated).
 */

import { db } from "@/lib/db";

interface CohortLiftEntry {
  courseId: string;
  enrollments: number;
  cohortLiftSignal: number;  // 0-1, > 0.5 = peer-validated boost
}

const TIER_PROXIMITY = new Set(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]);

export async function computeCohortLift(
  talentProfileId: string,
): Promise<Map<string, CohortLiftEntry>> {
  const profile = await db.talentProfile.findUnique({
    where: { id: talentProfileId },
    select: { tier: true, driverSpecialties: true },
  });
  if (!profile) return new Map();

  const ds = profile.driverSpecialties as { specialty?: string } | null;
  const specialty = ds?.specialty ?? null;
  if (!specialty || !TIER_PROXIMITY.has(profile.tier)) return new Map();

  // Cohort = same specialty + same tier (broad)
  type Peer = { id: string; userId: string; avgScore: number };
  const peers = (await db.talentProfile.findMany({
    where: {
      tier: profile.tier,
      id: { not: talentProfileId },
    },
    select: { id: true, userId: true, avgScore: true, driverSpecialties: true },
    take: 500,
  })) as Array<Peer & { driverSpecialties: unknown }>;

  // Filter cohort by specialty match
  const cohortPeers = peers.filter((p) => {
    const pds = p.driverSpecialties as { specialty?: string } | null;
    return pds?.specialty === specialty;
  });
  if (cohortPeers.length < 3) return new Map();

  const cohortIds = cohortPeers.map((p) => p.userId);
  const cohortAvg = cohortPeers.reduce((s, p) => s + (p.avgScore ?? 0), 0) / cohortPeers.length;

  // Look at completed enrollments for cohort
  type CompletedRow = { courseId: string; userId: string; score: number | null };
  const completed = (await db.enrollment.findMany({
    where: { userId: { in: cohortIds }, status: "COMPLETED" },
    select: { courseId: true, userId: true, score: true },
  })) as CompletedRow[];

  // Aggregate per course
  const perCourse = new Map<string, { enrollments: number; sumScore: number; n: number }>();
  for (const e of completed) {
    const prev = perCourse.get(e.courseId) ?? { enrollments: 0, sumScore: 0, n: 0 };
    prev.enrollments++;
    if (e.score != null) {
      prev.sumScore += e.score;
      prev.n++;
    }
    perCourse.set(e.courseId, prev);
  }

  const lift = new Map<string, CohortLiftEntry>();
  for (const [courseId, agg] of perCourse.entries()) {
    if (agg.n === 0) {
      // No score data → low confidence
      lift.set(courseId, { courseId, enrollments: agg.enrollments, cohortLiftSignal: 0.2 });
      continue;
    }
    const courseAvg = agg.sumScore / agg.n;
    // Signal : how much the course's avgScore exceeds the cohort baseline
    const raw = (courseAvg - cohortAvg) / 10; // normalized to ~ -0.5..+0.5
    const signal = Math.max(0, Math.min(1, 0.5 + raw));
    lift.set(courseId, { courseId, enrollments: agg.enrollments, cohortLiftSignal: signal });
  }

  return lift;
}
