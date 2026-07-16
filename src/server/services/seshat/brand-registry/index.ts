/**
 * ADR-0151 — Base de marques de Seshat (répertoire d'empreintes publiques).
 *
 * LE single-writer de `BrandFootprintSnapshot`. Chaque recherche `/scorer` est
 * conservée ici comme observation append-only — la donnée n'est JAMAIS perdue
 * (mandat opérateur : « Seshat doit construire sa base de données de marque »).
 * « Dernière row par `brandKey` » = le cache instantané des recherches répétées.
 *
 * Lane d'observabilité Seshat (comme `persistSnapshot`/feeds/weak-signals) :
 * écriture de service directe, best-effort, jamais gouvernée par un Intent — une
 * marque publique observée n'est pas une mutation d'entité gouvernée (Strategy/
 * Pillar). Sans PII (une marque n'est pas une personne). Zéro LLM.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Fraîcheur : au-delà, on propose « Actualiser » (les followers bougent lentement). */
export const FOOTPRINT_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface FootprintDimensionRow {
  key: string;
  /** Libellé lisible (« Site web », « Réseaux sociaux »…) — persisté pour le rapport factuel. */
  label?: string;
  /** Preuve factuelle mesurée (« 6 an(s) · registrar », « MX · SPF · DMARC »…). Sur quoi le score se base. */
  details?: string;
  measured: boolean;
  score: number | null;
  weight: number;
}

export interface RecordFootprintInput {
  name: string;
  websiteUrl?: string | null;
  countryCode?: string | null;
  sectorSlug?: string | null;
  total: number | null;
  measuredWeight: number | null;
  dimensions: FootprintDimensionRow[];
  followerCounts?: unknown;
  /** Faits observés (FootprintFacts) — la preuve du score, jamais perdue (ADR-0151). */
  facts?: unknown;
  source?: string;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

export interface FootprintObservation {
  brandKey: string;
  name: string;
  total: number | null;
  measuredWeight: number | null;
  dimensions: FootprintDimensionRow[];
  followerCounts: unknown;
  /** Faits observés persistés (FootprintFacts) — null sur les snapshots legacy. */
  facts: unknown;
  capturedAt: Date;
  /** true si plus vieux que `FOOTPRINT_STALE_AFTER_MS` → l'UI propose d'actualiser. */
  stale: boolean;
}

/**
 * Clé de dédup canonique : host du domaine (sans `www`, minuscule) si un site est
 * fourni ; sinon slug du nom (+ pays). Déterministe — deux recherches de « la même
 * marque » collident et servent le cache.
 */
export function normalizeBrandKey(input: {
  name: string;
  websiteUrl?: string | null;
  countryCode?: string | null;
}): string {
  const url = input.websiteUrl?.trim();
  if (url) {
    const host = extractHost(url);
    if (host) return host;
  }
  const slug = input.name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cc = input.countryCode?.trim().toLowerCase();
  return cc ? `${slug}@${cc}` : slug || "unknown";
}

function extractHost(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  if (!/^https?:\/\//.test(s)) s = `https://${s}`;
  try {
    const host = new URL(s).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function toDimensions(value: unknown): FootprintDimensionRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
    .map((d) => ({
      key: String(d.key ?? ""),
      label: typeof d.label === "string" ? d.label : undefined,
      details: typeof d.details === "string" ? d.details : undefined,
      measured: Boolean(d.measured),
      score: typeof d.score === "number" ? d.score : null,
      weight: typeof d.weight === "number" ? d.weight : 0,
    }));
}

/** Dernière observation pour une marque (le cache instantané). null si inconnue. */
export async function lookupLatestFootprint(
  brandKey: string,
  now: number = Date.now(),
): Promise<FootprintObservation | null> {
  const row = await db.brandFootprintSnapshot.findFirst({
    where: { brandKey },
    orderBy: { capturedAt: "desc" },
  });
  if (!row) return null;
  return {
    brandKey: row.brandKey,
    name: row.name,
    total: row.total,
    measuredWeight: row.measuredWeight,
    dimensions: toDimensions(row.dimensions),
    followerCounts: row.followerCounts,
    facts: row.facts,
    capturedAt: row.capturedAt,
    stale: now - row.capturedAt.getTime() > FOOTPRINT_STALE_AFTER_MS,
  };
}

/**
 * Enregistre une observation d'empreinte (append-only). Best-effort : jamais
 * throw — une base indisponible ne casse pas le score renvoyé au prospect.
 * Renvoie la row persistée (ou null si l'écriture a échoué).
 */
export async function recordFootprintObservation(
  input: RecordFootprintInput,
): Promise<FootprintObservation | null> {
  const brandKey = normalizeBrandKey(input);
  try {
    const row = await db.brandFootprintSnapshot.create({
      data: {
        brandKey,
        name: input.name.trim(),
        websiteUrl: input.websiteUrl?.trim() || null,
        countryCode: input.countryCode?.trim()?.slice(0, 2)?.toUpperCase() || null,
        sectorSlug: input.sectorSlug?.trim() || null,
        total: input.total,
        measuredWeight: input.measuredWeight,
        dimensions: input.dimensions as unknown as Prisma.InputJsonValue,
        followerCounts: toJson(input.followerCounts),
        facts: toJson(input.facts),
        source: input.source ?? "SCORER_FUNNEL",
      },
    });
    return {
      brandKey: row.brandKey,
      name: row.name,
      total: row.total,
      measuredWeight: row.measuredWeight,
      dimensions: toDimensions(row.dimensions),
      followerCounts: row.followerCounts,
      facts: row.facts,
      capturedAt: row.capturedAt,
      stale: false,
    };
  } catch {
    return null;
  }
}

export interface BrandDirectoryEntry {
  brandKey: string;
  name: string;
  websiteUrl: string | null;
  countryCode: string | null;
  sectorSlug: string | null;
  total: number | null;
  lastCapturedAt: Date;
  observations: number;
}

/**
 * Répertoire pour la console (opérateur) : dernière observation par marque +
 * nombre d'observations. Lecture seule — rend la base de Seshat visible.
 */
export async function listBrandDirectory(limit = 200): Promise<BrandDirectoryEntry[]> {
  const rows = await db.brandFootprintSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    take: 2000,
  });
  const latest = new Map<string, BrandDirectoryEntry>();
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.brandKey, (counts.get(r.brandKey) ?? 0) + 1);
    if (!latest.has(r.brandKey)) {
      latest.set(r.brandKey, {
        brandKey: r.brandKey,
        name: r.name,
        websiteUrl: r.websiteUrl,
        countryCode: r.countryCode,
        sectorSlug: r.sectorSlug,
        total: r.total,
        lastCapturedAt: r.capturedAt,
        observations: 0,
      });
    }
  }
  const out = [...latest.values()].map((e) => ({ ...e, observations: counts.get(e.brandKey) ?? 1 }));
  return out.slice(0, limit);
}
