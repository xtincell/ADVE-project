/**
 * ADR-0149 — Scoreur à force révélée : LE single-writer d'`Epreuve` / `BrandRef` /
 * `ScoreVerdict` + l'orchestrateur `scoreBrand` (sous-domaine SESHAT).
 *
 * Le registre est append-only ; l'estimation est 100 % déterministe (domaine pur
 * `@/domain/scoreur`) ; deux runs sur le même registre = le même verdict. Zéro LLM.
 * `scoring.ts` (complétude structurelle ADR-0102) reste INTACT — deux scores, deux
 * rôles, jamais fusionnés (D9). Verrou HARD `scoreur-single-writer.test.ts`.
 */

import { db } from "@/lib/db";
import { Prisma, type Epreuve, type ScoreVerdict as StoredScoreVerdict } from "@prisma/client";
import type { MarketScale } from "@/domain/market-scale";
import { resolveEvidenceTargets } from "@/domain/market-scale";
import { canonicalSectorSlug } from "@/domain/sector-taxonomy";
import {
  COHERENCE_THRESHOLD,
  connectedScoreurObservations,
  defaultThetaForScale,
  MUST_HAVE_ITEMS,
  resolveRevealedGates,
  scoreFromEpreuves,
  SCOREUR_ARENAS,
  type CompiledEpreuve,
  type LeagueKey,
  type RevealedGateThresholds,
  type RevealedSignals,
  type ScoreVerdict,
  type ScoreurArena,
} from "@/domain/scoreur";
import { compileMeasuredEpreuves, ITEM_OPPONENTS } from "./compilateur";
import { resolveScoreurCanon } from "./canon";

// ── single-writers ───────────────────────────────────────────────────────────

export interface RecordEpreuveInput {
  subjectStrategyId?: string | null;
  subjectBrandRefId?: string | null;
  opponentBrandRefId?: string | null;
  opponentStrategyId?: string | null;
  arena: ScoreurArena;
  league: LeagueKey;
  result: "WIN" | "LOSS" | "DRAW";
  proofWeight: number;
  source: string;
  occurredAt: string;
}

/** Écriture unique d'une épreuve (append-only). */
export async function recordEpreuve(input: RecordEpreuveInput, client?: Prisma.TransactionClient): Promise<Epreuve> {
  if (!client) return db.$transaction((tx) => recordEpreuve(input, tx));
  const occurredAt = new Date(input.occurredAt);
  if (!input.source.trim() || !Number.isFinite(occurredAt.getTime())) throw new Error("Source et date d’observation requises");
  const data = {
    subjectStrategyId: input.subjectStrategyId ?? null,
    subjectBrandRefId: input.subjectBrandRefId ?? null,
    opponentBrandRefId: input.opponentBrandRefId ?? null,
    opponentStrategyId: input.opponentStrategyId ?? null,
    arena: input.arena,
    sectorSlug: input.league.sectorSlug,
    marketScale: (input.league.marketScale ?? null) as MarketScale | null,
    countryCode: input.league.countryCode ?? null,
    result: input.result,
    proofWeight: input.proofWeight,
    source: input.source,
    occurredAt,
  };
  // Exact observation replay, not a second win. The transaction lock also
  // covers concurrent submissions without a new registry or schema change.
  const identity = JSON.stringify(data);
  await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))`;
  const previous = await client.epreuve.findFirst({ where: data });
  return previous ?? client.epreuve.create({ data });
}

/** Écriture unique d'un BrandRef (rival/ancre/item). Idempotent par slug. */
export async function upsertBrandRef(input: {
  kind: "RIVAL" | "ANCHOR" | "ITEM";
  slug: string;
  name: string;
  sectorSlug?: string | null;
  marketScale?: MarketScale | null;
  countryCode?: string | null;
  fixedTheta?: number | null;
  source?: string | null;
}) {
  return db.brandRef.upsert({
    where: { slug: input.slug },
    update: { name: input.name, fixedTheta: input.fixedTheta ?? null, source: input.source ?? null },
    create: {
      kind: input.kind,
      slug: input.slug,
      name: input.name,
      sectorSlug: input.sectorSlug ?? null,
      marketScale: input.marketScale ?? null,
      countryCode: input.countryCode ?? null,
      fixedTheta: input.fixedTheta ?? null,
      source: input.source ?? null,
    },
  });
}

/** Écriture unique d'un snapshot de verdict (leaderboard + trajectoire). */
export async function writeVerdict(
  subject: { strategyId?: string | null; brandRefId?: string | null; label: string },
  verdict: ScoreVerdict,
  epreuveCount: number,
  client: Prisma.TransactionClient = db,
) {
  return client.scoreVerdict.create({
    data: {
      subjectStrategyId: subject.strategyId ?? null,
      subjectBrandRefId: subject.brandRefId ?? null,
      subjectLabel: subject.label,
      sectorSlug: verdict.league.sectorSlug,
      marketScale: (verdict.league.marketScale ?? null) as MarketScale | null,
      countryCode: verdict.league.countryCode ?? null,
      force: verdict.force,
      tier: verdict.tier,
      coherence: verdict.coherence,
      coveragePct: verdict.coveragePct,
      arenas: verdict.arenas as unknown as object,
      gates: verdict.gates as unknown as object,
      cappedReason: verdict.cappedReason,
      epreuveCount,
    },
  });
}

// ── orchestration ────────────────────────────────────────────────────────────

/** Résout la ligue (polity) d'une marque : secteur (Client) × échelle × pays. */
export async function resolveLeagueForStrategy(strategyId: string, client: Prisma.TransactionClient = db): Promise<LeagueKey & { label: string }> {
  const strategy = await client.strategy.findUnique({
    where: { id: strategyId },
    select: { name: true, marketScale: true, countryCode: true, client: { select: { sector: true } } },
  });
  if (!strategy) throw new Error("Stratégie sujet introuvable");
  const sectorSlug = canonicalSectorSlug(strategy?.client?.sector);
  return {
    sectorSlug,
    marketScale: strategy?.marketScale ?? null,
    countryCode: strategy?.countryCode ?? null,
    label: strategy?.name ?? strategyId,
  };
}

/** Stored duels use IDs; measured items retain their semantic slug references. */
export async function loadAnchorsForLeague(league: LeagueKey, client: Prisma.TransactionClient = db): Promise<Record<string, number>> {
  const rows = await client.brandRef.findMany({
    where: { fixedTheta: { not: null }, AND: [
      { OR: [{ sectorSlug: null }, { sectorSlug: league.sectorSlug }] },
      { OR: [{ marketScale: null }, { marketScale: league.marketScale as MarketScale | null }] },
      { OR: [{ countryCode: null }, { countryCode: league.countryCode }] },
    ] },
    select: { id: true, slug: true, fixedTheta: true },
  });
  const anchors: Record<string, number> = {};
  for (const r of rows) if (r.fixedTheta != null) anchors[r.slug] = r.fixedTheta;
  // Canonical IDs win if a legacy slug happens to collide with an ID.
  for (const r of rows) if (r.fixedTheta != null) anchors[r.id] = r.fixedTheta;
  return anchors;
}

/** Convertit les épreuves persistées (A/D/V, sourcées) en épreuves compilées. */
function persistedToCompiled(
  rows: { subjectStrategyId: string | null; subjectBrandRefId: string | null; opponentBrandRefId: string | null; opponentStrategyId: string | null; arena: string; result: string; proofWeight: number; source: string; occurredAt: Date }[],
): CompiledEpreuve[] {
  return rows.flatMap((r) => {
    const subjectRef = r.subjectStrategyId ?? r.subjectBrandRefId;
    const opponentRef = r.opponentBrandRefId ?? r.opponentStrategyId;
    if (!subjectRef || !opponentRef || !r.source.trim()) return [];
    return [{
      subjectRef,
      opponentRef,
      arena: r.arena as ScoreurArena,
      result: r.result as "WIN" | "LOSS" | "DRAW",
      proofWeight: r.proofWeight,
      source: r.source,
      occurredAt: r.occurredAt.toISOString(),
    }];
  });
}

export interface ScoreBrandResult {
  verdict: ScoreVerdict;
  epreuveCount: number;
  superfanCount: number;
  verdictId: string;
}

/**
 * Score une marque de la plateforme : compile E+T mesurées + charge les épreuves
 * A/D/V persistées, applique les items franchis, estime, persiste le verdict.
 * `persist=false` pour un run de vérification (reproductibilité) sans snapshot.
 */
export async function scoreBrand(
  strategyId: string,
  opts: { nowIso?: string; persist?: boolean; client?: Prisma.TransactionClient } = {},
): Promise<ScoreBrandResult> {
  const client = opts.client ?? db;
  const nowIso = opts.nowIso ?? new Date().toISOString();
  const league = await resolveLeagueForStrategy(strategyId, client);
  const targets = resolveEvidenceTargets({
    marketScale: league.marketScale as MarketScale | null,
    addressableAudience: null,
  });

  // Épreuves mesurées (E + T) + persistées (A/D/V, registre).
  const measured = await compileMeasuredEpreuves({
    strategyId,
    nowIso,
    superfanFloor: targets.superfansTarget,
    audienceFloor: targets.audienceFloor,
    // V3 : le standard de SIGNAUX TIERS du rang disputé (ADR-0126) — la presse
    // collectée s'y mesure enfin au lieu de rester décorative.
    thirdPartyFloor: targets.tarsisTarget,
  }, client);
  const persistedRows = await client.epreuve.findMany({
    // Une ligue = une jauge. Ne réutilise ni une ancienne ligue du sujet ni un
    // ScoreVerdict estimé pour transformer la force d'un rival en observation.
    where: { sectorSlug: league.sectorSlug, marketScale: league.marketScale as MarketScale | null, countryCode: league.countryCode },
    orderBy: { id: "asc" },
    select: {
      subjectStrategyId: true, subjectBrandRefId: true, opponentBrandRefId: true, opponentStrategyId: true,
      arena: true, result: true, proofWeight: true, source: true, occurredAt: true,
    },
  });
  const persisted = persistedToCompiled(persistedRows);
  // Résout les θ des items opponents (compilateur) s'ils manquent en base.
  const anchors = await loadAnchorsForLeague(league, client);
  for (const slug of Object.values(ITEM_OPPONENTS)) {
    if (anchors[slug] === undefined) {
      anchors[slug] = defaultThetaForScale(league.marketScale as MarketScale | null);
    }
  }

  // Only connected rivals can inform this subject. The same pure traversal is
  // used by the estimator; shared fixed items never drag in unrelated brands.
  const connectedIds = new Set<string>();
  for (const arena of SCOREUR_ARENAS) {
    for (const id of connectedScoreurObservations(strategyId, persisted.filter(e => e.arena === arena), anchors).nodes) {
      if (id !== strategyId && anchors[id] === undefined) connectedIds.add(id);
    }
  }
  const rivals = connectedIds.size ? await client.strategy.findMany({
    where: { id: { in: [...connectedIds] }, marketScale: league.marketScale as MarketScale | null, countryCode: league.countryCode },
    select: { id: true, client: { select: { sector: true } } },
    orderBy: { id: "asc" },
  }) : [];
  const epreuves = [...measured.epreuves, ...persisted];
  for (const rival of rivals) {
    if (canonicalSectorSlug(rival.client?.sector) !== league.sectorSlug) continue;
    const observed = await compileMeasuredEpreuves({
      strategyId: rival.id, nowIso, superfanFloor: targets.superfansTarget,
      audienceFloor: targets.audienceFloor, thirdPartyFloor: targets.tarsisTarget,
    }, client);
    epreuves.push(...observed.epreuves);
  }
  const epreuveCount = epreuves.filter(e => e.subjectRef === strategyId || e.opponentRef === strategyId).length;

  // Audience cumulée ≥ plancher de ligue : arène A gagnée au footprint (ADR-0153).
  const audienceMeetsFloor = measured.epreuves.some(
    (e) => e.arena === "A" && e.opponentRef === ITEM_OPPONENTS.aAudienceFloor && e.result === "WIN",
  );

  // Canon éditable a posteriori (ADR-0150) : override DB par-dessus les défauts code.
  // Résolu AVANT les items — ses seuils de portes révélées pilotent computeItemsMet.
  const canon = await resolveScoreurCanon(client);

  // Items franchis (mesurés + preuve publique révélée + items gagnés au registre).
  const itemsMet = await computeItemsMet(
    strategyId,
    {
      superfanCount: measured.superfanCount,
      superfanFloor: targets.superfansTarget,
      favorableOverton: measured.favorableOverton,
      audienceMeetsFloor,
    },
    canon.revealedThresholds,
    client,
    league,
  );

  // 1er passage → cohérence ; ajoute l'item coherence-seuil si R ≥ seuil.
  const first = scoreFromEpreuves({ subjectRef: strategyId, league, epreuves, anchors, itemsMet, canon });
  if (first.coherence >= COHERENCE_THRESHOLD) itemsMet.add("coherence-seuil");
  const verdict = scoreFromEpreuves({ subjectRef: strategyId, league, epreuves, anchors, itemsMet, canon });

  let verdictId = "";
  if (opts.persist !== false) {
    const row = await writeVerdict(
      { strategyId, label: league.label },
      verdict,
      epreuveCount,
      client,
    );
    verdictId = row.id;
  }
  return { verdict, epreuveCount, superfanCount: measured.superfanCount, verdictId };
}

/** Public placements: latest per brand BEFORE league filters or result limits. */
export async function listLatestPublicVerdicts(
  filters: { sectorSlug?: string | null; marketScale?: MarketScale | null; countryCode?: string | null; limit?: number } = {},
): Promise<StoredScoreVerdict[]> {
  return db.$queryRaw<StoredScoreVerdict[]>(Prisma.sql`
    WITH latest AS (
      SELECT DISTINCT ON (COALESCE("subjectStrategyId", "subjectBrandRefId", "subjectLabel")) *
      FROM "ScoreVerdict"
      ORDER BY COALESCE("subjectStrategyId", "subjectBrandRefId", "subjectLabel"), "computedAt" DESC, "id" DESC
    )
    SELECT * FROM latest
    WHERE TRUE
      ${filters.sectorSlug ? Prisma.sql`AND "sectorSlug" = ${filters.sectorSlug}` : Prisma.empty}
      ${filters.marketScale ? Prisma.sql`AND "marketScale" = ${filters.marketScale}::"MarketScale"` : Prisma.empty}
      ${filters.countryCode ? Prisma.sql`AND "countryCode" = ${filters.countryCode}` : Prisma.empty}
    ORDER BY "force" DESC, "subjectLabel" ASC, "id" ASC
    ${filters.limit == null ? Prisma.empty : Prisma.sql`LIMIT ${filters.limit}`}
  `);
}

/** Items franchis : signaux mesurés + preuve publique révélée + items gagnés au registre. */
async function computeItemsMet(
  strategyId: string,
  signals: { superfanCount: number; superfanFloor: number; favorableOverton: number; audienceMeetsFloor: boolean },
  revealedThresholds?: RevealedGateThresholds,
  client: Prisma.TransactionClient = db,
  league?: LeagueKey,
): Promise<Set<string>> {
  const met = new Set<string>();
  if (signals.superfanCount >= signals.superfanFloor && signals.superfanFloor > 0) met.add("masse-superfan");
  if (signals.favorableOverton >= 1) met.add("duel-cadre-overton");

  // Portes de bas de palier franchies par PREUVE PUBLIQUE RÉVÉLÉE (empreinte
  // mesurée, provenance SOURCE — jamais l'ADVE déclaré). Doctrine « force
  // révélée » : une marque nationale ancienne franchit FRAGILE/ORDINAIRE sur
  // preuve datée (RDAP), presse, audience, avis. `actif-distinctif` (FORTE+)
  // reste gagné au registre. Cf. `@/domain/scoreur/revealed-gates`.
  const revealed = await readRevealedSignals(strategyId, signals.audienceMeetsFloor, client);
  for (const gate of resolveRevealedGates(revealed, revealedThresholds)) met.add(gate);

  // Items gagnés au registre : épreuve WIN dont l'opponent est un ITEM slug=item-<id>.
  const itemIds = new Set(MUST_HAVE_ITEMS.map((i) => i.id));
  const wonItems = await client.epreuve.findMany({
    where: { subjectStrategyId: strategyId, result: "WIN", opponentBrandRefId: { not: null },
      ...(league ? { sectorSlug: league.sectorSlug, marketScale: league.marketScale as MarketScale | null, countryCode: league.countryCode } : {}),
    },
    select: { opponentBrandRefId: true },
  });
  if (wonItems.length) {
    const refs = await client.brandRef.findMany({
      where: { id: { in: wonItems.map((w) => w.opponentBrandRefId!).filter(Boolean) }, kind: "ITEM" },
      select: { slug: true },
    });
    for (const r of refs) {
      const id = r.slug.replace(/^item-/, "");
      if (itemIds.has(id)) met.add(id);
    }
  }
  return met;
}

/**
 * Signaux publics révélés d'une marque, lus depuis l'empreinte MESURÉE (pilier E
 * `webPresence`, provenance SOURCE — footprint observé, jamais l'ADVE déclaré).
 * Absence honnête : un champ non mesuré reste neutre (jamais fabriqué, P22-2).
 */
async function readRevealedSignals(strategyId: string, audienceMeetsFloor: boolean, client: Prisma.TransactionClient = db): Promise<RevealedSignals> {
  const pillar = await client.pillar.findFirst({
    where: { strategyId, key: "e" },
    select: { content: true },
  });
  const wp = ((pillar?.content as Record<string, unknown> | null)?.webPresence ?? {}) as Record<string, unknown>;
  const domain = wp.domain as { ageYears?: number | null } | undefined;
  const maps = wp.maps as { status?: string; reviewCount?: number | null } | undefined;
  const site = wp.site as { tech?: unknown } | undefined;
  const press = Array.isArray(wp.press) ? wp.press : [];
  const socials = Array.isArray(wp.socials) ? wp.socials : [];
  // Empreinte P22-1 : seule la donnée d'un état LIVE a été persistée (ADR-0121).
  // Wikipédia = axe A (notabilité) ; autocomplete = axe D (demande de recherche).
  const wikipedia = wp.wikipedia as { hasPage?: boolean } | undefined;
  const autocomplete = wp.searchAutocomplete as { brandAppearsInOwnSuggest?: boolean } | undefined;
  return {
    domainAgeYears: typeof domain?.ageYears === "number" ? domain.ageYears : null,
    pressCount: press.length,
    hasReviews: maps?.status === "LIVE" && (maps.reviewCount ?? 0) > 0,
    siteReachable: Boolean(site?.tech),
    publicSocialCount: socials.length,
    audienceMeetsFloor,
    hasWikipediaPage: wikipedia?.hasPage === true,
    brandInOwnAutocomplete: autocomplete?.brandAppearsInOwnSuggest === true,
  };
}
