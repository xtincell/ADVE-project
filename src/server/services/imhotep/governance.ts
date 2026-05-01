/**
 * Imhotep governance — devotion-potential matching gates.
 *
 * Téléologie ADR-0010 §3 : matching basé sur footprint sectorielle de
 * superfans recrutés + force dans le manipulation mode requis, pas CV brut.
 */

import { db } from "@/lib/db";
import type { ManipulationMode } from "@/server/services/ptah/types";
import type { MatchCandidate } from "./types";

export class CrewMissingError extends Error {
  readonly reason = "CREW_MISSING";
  constructor(public readonly missionId: string) {
    super(`Mission ${missionId} not found or has no actionable brief.`);
    this.name = "CrewMissingError";
  }
}

export class TalentNotFoundError extends Error {
  readonly reason = "TALENT_NOT_FOUND";
  constructor(public readonly talentProfileId: string) {
    super(`TalentProfile ${talentProfileId} not found.`);
    this.name = "TalentNotFoundError";
  }
}

interface DriverSpecialties {
  specialty?: string;
  devotionFootprint?: Record<string, number>;
  manipulationStrengths?: ManipulationMode[];
}

/**
 * Lecture du devotion-footprint d'un creator pour un secteur donné.
 * Retourne 0 si le footprint n'existe pas (creator nouveau).
 */
export function getDevotionInSector(
  driverSpecialties: unknown,
  sector: string,
): number {
  if (!driverSpecialties || typeof driverSpecialties !== "object") return 0;
  const ds = driverSpecialties as DriverSpecialties;
  if (!ds.devotionFootprint) return 0;
  return ds.devotionFootprint[sector] ?? 0;
}

/**
 * Vérifie si le creator a la force dans le manipulation mode requis.
 */
export function hasManipulationFit(
  driverSpecialties: unknown,
  required: ManipulationMode,
): boolean {
  if (!driverSpecialties || typeof driverSpecialties !== "object") return false;
  const ds = driverSpecialties as DriverSpecialties;
  return ds.manipulationStrengths?.includes(required) ?? false;
}

/**
 * Pondère le score de matching brut avec les composantes téléologiques.
 *
 * Score brut (skill+tier+performance) reçu — pondéré par :
 *  - +30 max si devotion footprint sectoriel élevé
 *  - +20 si manipulation mode aligné
 *
 * Le score final est borné à 100.
 */
export function weightDevotionPotential(
  rawScore: number,
  devotionInSector: number,
  manipulationFit: boolean,
): number {
  // Devotion footprint : 0-1000 max attendu → mapping log to 0-30 bonus
  const devotionBonus = devotionInSector > 0
    ? Math.min(30, Math.round(Math.log10(devotionInSector + 1) * 12))
    : 0;
  const manipBonus = manipulationFit ? 20 : 0;
  return Math.min(100, Math.round(rawScore + devotionBonus + manipBonus));
}

/**
 * Renvoie les reasons text suivant les composantes téléologiques.
 */
export function buildMatchReasons(
  baseReasons: readonly string[],
  devotionInSector: number,
  manipulationFit: boolean,
  manipulationMode: ManipulationMode | null,
): string[] {
  const out = [...baseReasons];
  if (devotionInSector > 0) {
    out.push(`devotion footprint sector=${devotionInSector}`);
  }
  if (manipulationFit && manipulationMode) {
    out.push(`manipulation strength: ${manipulationMode}`);
  }
  if (!manipulationFit && manipulationMode) {
    out.push(`⚠ manipulation gap: ${manipulationMode} not in strengths`);
  }
  return out;
}

/**
 * Re-rank une liste de candidats avec la téléologie devotion-potential.
 * Conserve l'ordre stable secondairement par avgScore.
 */
export function rerankByDevotionPotential(
  candidates: readonly MatchCandidate[],
): MatchCandidate[] {
  return [...candidates].sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Lookup secteur d'une strategy. Lit d'abord la colonne first-class
 * `Strategy.sector` (Sprint P, indexée), fallback `businessContext.sector`
 * pour les rows pré-migration. Retourne "UNKNOWN" si rien.
 */
export async function resolveStrategySector(strategyId: string): Promise<string> {
  const strategy = (await db.strategy.findUnique({
    where: { id: strategyId },
    select: { sector: true, businessContext: true } as never,
  })) as { sector: string | null; businessContext: unknown } | null;
  if (strategy?.sector) return strategy.sector;
  if (!strategy?.businessContext) return "UNKNOWN";
  const ctx = strategy.businessContext as { sector?: string };
  return ctx.sector ?? "UNKNOWN";
}
