/**
 * JEHUTY_FEED_REFRESH — orchestrateur de rafraîchissement de la Gazette.
 *
 * La Gazette (`jehuty.feed`) est une lecture LIVE : elle n'affiche que ce que
 * d'autres pipelines ont écrit en base. Or ces pipelines (veille externe,
 * diagnostic, score, signaux) n'étaient déclenchés par RIEN — l'Intent
 * `JEHUTY_FEED_REFRESH` était déclaré au registre mais n'avait aucun handler.
 * Résultat : une marque pouvait rester des jours sans aucune dépêche, quels
 * que soient les connecteurs branchés.
 *
 * Cet orchestrateur ferme le trou : pour UNE marque, il exécute — best-effort,
 * chacun indépendant — les producteurs des 6 rubriques, puis rapporte un
 * statut HONNÊTE par rubrique. Il est appelé par le bouton « Rafraîchir » du
 * Cockpit et par le cron quotidien `/api/cron/jehuty-refresh`.
 *
 * DOCTRINE — zéro fabrication (ADR-0046/0134) : chaque rubrique se remplit de
 * VRAIE donnée (veille RSS réelle, diagnostic déterministe, deltas d'audience
 * réels, dérivation de la veille captée) ou dit honnêtement pourquoi elle est
 * vide / différée. Aucune dépêche inventée. Les recommandations (rubrique 5)
 * passent par le LLM (Notoria) — seul point génératif, borné et facultatif ;
 * elles sortent en PENDING et n'altèrent aucun pilier sans le clic opérateur
 * (STOP-à-Jehuty préservé au point qui compte : l'écriture ADVE).
 */

import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { PILLAR_KEYS, classifyBrand } from "@/lib/types/advertis-vector";
import { getOrBuildBrandFeed, type BrandFeedArticle } from "@/server/services/seshat/external-feeds/brand-feed";
import { runDiagnostic } from "@/server/services/diagnostic-engine";

export type GazetteSection =
  | "EXTERNAL_SIGNAL"
  | "DIAGNOSTIC"
  | "SCORE_DRIFT"
  | "MARKET_SIGNAL"
  | "RECOMMENDATION"
  | "WEAK_SIGNAL";

export type SectionStatus = "FILLED" | "EMPTY" | "DEFERRED" | "ERROR";

export interface GazetteSectionResult {
  section: GazetteSection;
  status: SectionStatus;
  count: number;
  /** Phrase courte, lisible par le fondateur (rubrique remplie / vide / différée / en erreur). */
  detail: string;
}

export interface RefreshGazetteResult {
  strategyId: string;
  ranAt: string;
  sections: GazetteSectionResult[];
  totalNew: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers purs (testables sans DB/réseau)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Variation d'audience par plateforme depuis des relevés triés DÉCROISSANT par
 * date (dernier vs précédent). Pur, déterministe. `allSinglePoint` = toutes les
 * plateformes n'ont qu'un seul relevé (pas encore de variation mesurable).
 */
export function computeFollowerDeltas(
  snaps: ReadonlyArray<{ platform: string; followerCount: number }>,
): { deltas: Array<{ platform: string; from: number; to: number; delta: number }>; allSinglePoint: boolean } {
  const byPlatform = new Map<string, Array<{ platform: string; followerCount: number }>>();
  for (const s of snaps) {
    const arr = byPlatform.get(s.platform) ?? [];
    arr.push(s);
    byPlatform.set(s.platform, arr);
  }
  const deltas: Array<{ platform: string; from: number; to: number; delta: number }> = [];
  for (const [platform, arr] of byPlatform) {
    const latest = arr[0];
    const prev = arr[1]; // entrée déjà triée desc
    if (!latest || !prev) continue;
    const delta = latest.followerCount - prev.followerCount;
    if (delta !== 0) deltas.push({ platform, from: prev.followerCount, to: latest.followerCount, delta });
  }
  const allSinglePoint = [...byPlatform.values()].every((a) => a.length < 2);
  return { deltas, allSinglePoint };
}

/**
 * Thème émergent = terme significatif (≥ 4 lettres, hors stopwords / marque /
 * secteur / nombres) présent dans ≥ 3 titres DISTINCTS. Pur, déterministe —
 * analyse de vraie donnée captée, jamais un thème inventé. Retourne le terme le
 * plus fréquent, ou null.
 */
export function detectEmergingTerm(
  titles: ReadonlyArray<string>,
  excludeTokens: ReadonlySet<string>,
): { term: string; n: number } | null {
  const termArticles = new Map<string, Set<number>>();
  titles.forEach((title, i) => {
    const seen = new Set<string>();
    for (const raw of title.toLowerCase().split(/[^a-zà-ÿ0-9]+/)) {
      const t = raw.trim();
      if (t.length < 4 || STOPWORDS.has(t) || excludeTokens.has(t) || /^\d+$/.test(t)) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      const set = termArticles.get(t) ?? new Set<number>();
      set.add(i);
      termArticles.set(t, set);
    }
  });
  let best: { term: string; n: number } | null = null;
  for (const [term, set] of termArticles) {
    if (set.size >= 3 && (!best || set.size > best.n)) best = { term, n: set.size };
  }
  return best;
}

const ok = (section: GazetteSection, count: number, detail: string): GazetteSectionResult => ({ section, status: count > 0 ? "FILLED" : "EMPTY", count, detail });
const deferred = (section: GazetteSection, detail: string): GazetteSectionResult => ({ section, status: "DEFERRED", count: 0, detail });
const errored = (section: GazetteSection, detail: string): GazetteSectionResult => ({ section, status: "ERROR", count: 0, detail });

/**
 * Rafraîchit la Gazette d'UNE marque. Best-effort par rubrique — l'échec d'un
 * producteur n'empêche jamais les autres. `withRecos: false` coupe l'unique
 * étape LLM (utile pour un cron 100 % déterministe).
 */
export async function refreshBrandGazette(
  strategyId: string,
  opts: { force?: boolean; withRecos?: boolean; client?: PrismaClient } = {},
): Promise<RefreshGazetteResult> {
  const prisma = opts.client ?? db;
  const withRecos = opts.withRecos ?? true;
  const sections: GazetteSectionResult[] = [];

  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    select: {
      id: true,
      name: true,
      advertis_vector: true,
      client: { select: { sector: true, country: true } },
    },
  });
  if (!strategy) throw new Error("Strategy introuvable");

  const sector = strategy.client?.sector ?? null;
  const countryCode = strategy.client?.country ?? "CM";

  // ── 1. Le monde dehors — veille externe réelle (RSS/Google News) ──────────
  let articles: BrandFeedArticle[] = [];
  try {
    const feed = await getOrBuildBrandFeed(
      prisma,
      { strategyId, name: strategy.name, countryCode, sector },
      { force: opts.force ?? true },
    );
    articles = feed.articles;
    sections.push(ok("EXTERNAL_SIGNAL", articles.length, articles.length > 0
      ? `${articles.length} article(s) captés sur : ${feed.subjects.join(", ")}`
      : "Aucune actualité captée sur vos sujets suivis aujourd'hui."));
  } catch (e) {
    sections.push(errored("EXTERNAL_SIGNAL", `Collecte de veille indisponible : ${msg(e)}`));
  }

  // ── 2. Diagnostics — examen déterministe des fondations (zéro LLM) ─────────
  try {
    // Ré-exécutable : le diagnostic écrit avec un sourceHash unique
    // (`diagnostic-<id>`), donc on purge l'ancien pour toujours afficher le
    // plus récent au lieu de buter sur la contrainte d'unicité.
    await prisma.knowledgeEntry.deleteMany({
      where: { entryType: "DIAGNOSTIC_RESULT", sourceHash: `diagnostic-${strategyId}` },
    });
    const diag = await runDiagnostic(strategyId);
    const n = diag.prescriptions?.length ?? 0;
    sections.push(ok("DIAGNOSTIC", n, n > 0
      ? `${n} prescription(s) issues de l'examen de vos fondations.`
      : "Examen effectué — aucun point de friction majeur détecté."));
  } catch (e) {
    sections.push(errored("DIAGNOSTIC", `Diagnostic indisponible : ${msg(e)}`));
  }

  // ── 3. Mouvements de score — snapshot + drift déterministe ────────────────
  try {
    sections.push(await refreshScoreDrift(prisma, strategyId, strategy.advertis_vector));
  } catch (e) {
    sections.push(errored("SCORE_DRIFT", `Relevé de score indisponible : ${msg(e)}`));
  }

  // ── 4. Signaux marché — deltas d'audience RÉELS (followers) ───────────────
  try {
    sections.push(await refreshMarketSignal(prisma, strategyId));
  } catch (e) {
    sections.push(errored("MARKET_SIGNAL", `Lecture d'audience indisponible : ${msg(e)}`));
  }

  // ── 5. Recommandations — Notoria (LLM, PENDING, publié à la Gazette) ──────
  if (withRecos) {
    try {
      sections.push(await refreshRecommendations(prisma, strategyId));
    } catch (e) {
      sections.push(errored("RECOMMENDATION", `Génération indisponible : ${msg(e)}`));
    }
  } else {
    sections.push(deferred("RECOMMENDATION", "Génération de recommandations non demandée pour ce passage."));
  }

  // ── 6. Signaux faibles — thèmes émergents dérivés de la veille RÉELLE ─────
  try {
    sections.push(await refreshWeakSignals(prisma, strategyId, strategy.name, sector, articles));
  } catch (e) {
    sections.push(errored("WEAK_SIGNAL", `Analyse des signaux faibles indisponible : ${msg(e)}`));
  }

  const totalNew = sections.reduce((s, x) => s + x.count, 0);
  return { strategyId, ranAt: new Date().toISOString(), sections, totalNew };
}

// ───────────────────────────────────────────────────────────────────────────
// Producteurs par rubrique
// ───────────────────────────────────────────────────────────────────────────

/**
 * Pose un ScoreSnapshot depuis le vecteur courant et, si le composite a bougé
 * de > 15 pts (ou un pilier de > 10 %) vs le relevé précédent, émet un Signal
 * SCORE_IMPROVEMENT/SCORE_DECLINE. Premier relevé = référence posée (honnête).
 */
async function refreshScoreDrift(
  prisma: PrismaClient,
  strategyId: string,
  vectorJson: unknown,
): Promise<GazetteSectionResult> {
  const vec = (vectorJson ?? {}) as Record<string, number>;
  if (vec.composite == null) return deferred("SCORE_DRIFT", "Aucun score calculé pour l'instant.");

  const previous = await prisma.scoreSnapshot.findFirst({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
  });

  await prisma.scoreSnapshot.create({
    data: {
      strategyId,
      advertis_vector: vec as object,
      classification: classifyBrand(vec.composite ?? 0),
      confidence: vec.confidence ?? 0,
      trigger: "gazette_refresh",
    },
  });

  if (!previous) return ok("SCORE_DRIFT", 0, "Premier relevé de score posé — référence établie pour mesurer les prochains mouvements.");

  const prevVec = previous.advertis_vector as Record<string, number>;
  const changed: Array<{ key: string; prev: number; curr: number; pct: number }> = [];
  for (const key of PILLAR_KEYS) {
    const prev = prevVec[key] ?? 0;
    const curr = vec[key] ?? 0;
    if (prev === 0 && curr === 0) continue;
    const pct = prev !== 0 ? Math.abs((curr - prev) / prev) * 100 : (curr !== 0 ? 100 : 0);
    if (pct > 10) changed.push({ key, prev, curr, pct: Math.round(pct * 100) / 100 });
  }
  const prevComposite = prevVec.composite ?? 0;
  const currComposite = vec.composite ?? 0;
  const absDelta = Math.abs(currComposite - prevComposite);
  const significant = absDelta > 15;
  if (changed.length === 0 && !significant) return ok("SCORE_DRIFT", 0, "Votre score n'a pas bougé de façon significative depuis le dernier relevé.");

  const direction = currComposite >= prevComposite ? "SCORE_IMPROVEMENT" : "SCORE_DECLINE";
  await prisma.signal.create({
    data: {
      strategyId,
      type: direction,
      data: {
        source: "gazette_refresh",
        changedPillars: changed,
        compositeDelta: { previous: prevComposite, current: currComposite, absoluteDelta: Math.round(absDelta * 100) / 100, significant },
      },
    },
  });
  const verb = direction === "SCORE_IMPROVEMENT" ? "progressé" : "reculé";
  return ok("SCORE_DRIFT", 1, `Votre score a ${verb} de ${Math.round(absDelta)} pt(s) depuis le dernier relevé.`);
}

/**
 * Émet un MARKET_SIGNAL depuis la variation RÉELLE des relevés de followers
 * (FollowerSnapshot). Un seul relevé par plateforme = pas encore de variation
 * (honnête, jamais un delta inventé). Guarde contre le doublon quotidien.
 */
async function refreshMarketSignal(prisma: PrismaClient, strategyId: string): Promise<GazetteSectionResult> {
  const snaps = await prisma.followerSnapshot.findMany({
    where: { strategyId },
    orderBy: { capturedAt: "desc" },
    take: 60,
  });
  if (snaps.length === 0) return deferred("MARKET_SIGNAL", "Aucun relevé d'audience — connectez vos réseaux (Réglages → Connexions) pour alimenter cette rubrique.");

  const { deltas, allSinglePoint } = computeFollowerDeltas(snaps);
  if (deltas.length === 0) {
    return ok("MARKET_SIGNAL", 0, allSinglePoint
      ? "Audience relevée, mais un seul point de mesure — la variation apparaîtra au prochain relevé."
      : "Votre audience est stable depuis le dernier relevé.");
  }

  // Anti-doublon quotidien.
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const existing = await prisma.signal.findFirst({
    where: { strategyId, type: "MARKET_SIGNAL", createdAt: { gte: since } },
    select: { id: true },
  });
  if (existing) return ok("MARKET_SIGNAL", 0, "Variation d'audience déjà relevée aujourd'hui.");

  const totalDelta = deltas.reduce((s, d) => s + d.delta, 0);
  const sign = totalDelta >= 0 ? "+" : "";
  await prisma.signal.create({
    data: {
      strategyId,
      type: "MARKET_SIGNAL",
      data: {
        source: "gazette_refresh_followers",
        title: `Audience : ${sign}${totalDelta} abonné(s) net`,
        content: deltas.map((d) => `${d.platform} : ${d.from} → ${d.to} (${d.delta >= 0 ? "+" : ""}${d.delta})`).join(" · "),
        deltas,
      },
    },
  });
  return ok("MARKET_SIGNAL", 1, `Variation d'audience : ${sign}${totalDelta} abonné(s) net sur ${deltas.length} plateforme(s).`);
}

/**
 * Génère des recommandations Notoria ancrées sur le diagnostic du jour, puis
 * les PUBLIE à la Gazette (publishedAt) en statut PENDING. Unique étape LLM —
 * indisponible sans clé => DEFERRED honnête. N'altère aucun pilier (le clic
 * « Appliquer » reste l'acte opérateur).
 */
async function refreshRecommendations(prisma: PrismaClient, strategyId: string): Promise<GazetteSectionResult> {
  // Anti-doublon : si un batch a déjà publié des recos aujourd'hui, on n'en refait pas.
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const recent = await prisma.recommendation.count({
    where: { strategyId, publishedAt: { gte: since } },
  });
  if (recent > 0) return ok("RECOMMENDATION", 0, "Des recommandations ont déjà été publiées aujourd'hui.");

  // Observation = prescriptions du diagnostic du jour (déterministe, ancré réel).
  const diagEntry = await prisma.knowledgeEntry.findFirst({
    where: { entryType: "DIAGNOSTIC_RESULT", sourceHash: `diagnostic-${strategyId}` },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });
  const diagData = (diagEntry?.data ?? {}) as { localization?: unknown };
  const observation = `Diagnostic des fondations : ${JSON.stringify(diagData.localization ?? {})}. Proposer des améliorations concrètes des piliers les plus faibles.`;

  const { generateBatch } = await import("@/server/services/notoria/engine");
  const result = await generateBatch({ strategyId, missionType: "SESHAT_OBSERVATION", seshatObservation: observation });
  if (!result.totalRecos || !result.batchId) {
    return deferred("RECOMMENDATION", "Génération indisponible (service LLM injoignable) — réessayez plus tard ou générez depuis la console.");
  }

  // Publier à la Gazette : les recos PENDING du batch deviennent visibles
  // (publishedAt). L'application à un pilier reste un clic opérateur explicite.
  const published = await prisma.recommendation.updateMany({
    where: { batchId: result.batchId, publishedAt: null },
    data: { publishedAt: new Date() },
  });
  return ok("RECOMMENDATION", published.count, `${published.count} recommandation(s) publiées à valider.`);
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "les", "des", "une", "aux", "par", "pour", "avec",
  "dans", "sur", "que", "qui", "est", "sont", "son", "ses", "leur", "plus", "tout", "tous", "cette", "comme", "mais",
  "the", "new", "how", "why", "what", "who", "when", "will", "has", "have", "are", "was", "were", "not",
]);

/**
 * Dérive des « signaux faibles » de la veille RÉELLE captée : thèmes récurrents
 * dans les titres d'articles du jour (≥ 3 articles distincts partageant un
 * terme significatif). Analyse déterministe de vraie donnée — jamais un thème
 * inventé. Guarde contre le doublon quotidien.
 */
async function refreshWeakSignals(
  prisma: PrismaClient,
  strategyId: string,
  brandName: string,
  sector: string | null,
  articles: BrandFeedArticle[],
): Promise<GazetteSectionResult> {
  if (articles.length < 3) return ok("WEAK_SIGNAL", 0, "Pas assez de matière de veille pour dégager un thème émergent aujourd'hui.");

  // Exclut le nom de marque ET le terme secteur (ce sont les sujets injectés
  // dans la collecte — les compter serait circulaire, pas un signal faible).
  const excludeTokens = new Set(
    [...brandName.toLowerCase().split(/\s+/), ...(sector ?? "").toLowerCase().split(/\s+/)].filter(Boolean),
  );
  const best = detectEmergingTerm(articles.map((a) => a.title ?? ""), excludeTokens);
  if (!best) return ok("WEAK_SIGNAL", 0, "Aucun thème récurrent dans votre veille du jour.");

  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const existing = await prisma.signal.findFirst({
    where: { strategyId, type: "WEAK_SIGNAL_ALERT", createdAt: { gte: since } },
    select: { id: true },
  });
  if (existing) return ok("WEAK_SIGNAL", 0, "Signal faible déjà relevé aujourd'hui.");

  await prisma.signal.create({
    data: {
      strategyId,
      type: "WEAK_SIGNAL_ALERT",
      data: {
        source: "gazette_refresh_feed_terms",
        title: `Thème émergent dans votre veille : « ${best.term} »`,
        content: `Le terme « ${best.term} » revient dans ${best.n} article(s) de votre veille du jour — un frémissement à surveiller dans votre secteur.`,
        thesis: best.term,
        occurrences: best.n,
      },
    },
  });
  return ok("WEAK_SIGNAL", 1, `Thème émergent détecté : « ${best.term} » (${best.n} articles).`);
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
