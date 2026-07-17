/**
 * Signal Collector — Multi-frequency market data collection
 * Frequencies: REALTIME → MINUTE → HOURLY → DAILY → WEEKLY → MONTHLY → ANNUAL
 * Each frequency registers a Process DAEMON that the cron scheduler picks up.
 */

import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { UNTRUSTED_NOTICE, sanitizeInline } from "@/server/services/utils/untrusted-content";
import { db } from "@/lib/db";
import { z } from "zod";

export type SignalFrequency =
  | "REALTIME" | "MINUTE" | "HOURLY" | "DAILY"
  | "WEEKLY" | "MONTHLY" | "ANNUAL";

export interface CollectionStrategy {
  strategyId: string;
  sector: string;
  /** Legacy free-text market label. Kept for backwards compat. */
  market?: string;
  /** ADR-0037 PR-D — ISO-2 country code for country-aware LLM prompts. */
  countryCode?: string;
  /** ADR-0037 PR-D — display name (e.g. "Afrique du Sud"). */
  countryName?: string;
  /** ADR-0037 PR-D — Country.primaryLanguage. */
  primaryLanguage?: string;
  /** ADR-0037 PR-D — Country.purchasingPowerIndex (Cameroun=100, France=800). */
  purchasingPowerIndex?: number;
  /** ADR-0037 PR-D — Country.region (AFRICA_WEST / EUROPE / …). */
  region?: string;
  /** ADR-0037 PR-D — Country.marketMeta (truncated to 500 chars JSON in prompt). */
  countryMeta?: Record<string, unknown>;
  keywords: string[];
  competitors: string[];
  frequency: SignalFrequency;
}

/**
 * ADR-0037 PR-D — build the CONTEXTE PAYS block injected in Tarsis system
 * prompts. When countryCode is missing (legacy strategy), returns empty
 * string so the prompt remains fonctionnel sans bloc pays. When present,
 * returns a constraint block calqué sur le pattern anti-hallucination
 * Wakanda d'ADR-0030 §PR-Fix-2.
 */
export function buildCountryContextPrompt(c: {
  countryCode?: string;
  countryName?: string;
  primaryLanguage?: string;
  purchasingPowerIndex?: number;
  region?: string;
  countryMeta?: Record<string, unknown>;
}): string {
  if (!c.countryCode) return "";
  const metaJson = c.countryMeta
    ? JSON.stringify(c.countryMeta).slice(0, 500)
    : null;
  const lines = [
    "",
    "CONTEXTE PAYS — CONTRAINTE DURE :",
    `- Pays : ${c.countryName ?? c.countryCode} (${c.countryCode})`,
    c.primaryLanguage ? `- Langue principale : ${c.primaryLanguage}` : null,
    c.region ? `- Région : ${c.region}` : null,
    c.purchasingPowerIndex !== undefined
      ? `- Indice de pouvoir d'achat : ${c.purchasingPowerIndex} (Cameroun=100 baseline, France=800)`
      : null,
    metaJson ? `- Méta-marché : ${metaJson}` : null,
    "",
    `Tous les signaux et insights générés DOIVENT être plausibles dans ${c.countryName ?? c.countryCode}.`,
    "N'invente pas de réalités sectorielles transposées d'un autre pays. Si tu ne connais",
    `pas une dynamique spécifique à ${c.countryName ?? c.countryCode}, dis-le explicitement`,
    "(`incertain — généralisation depuis pays voisin`) plutôt que de fabriquer.",
    "",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export interface CollectedSignal {
  title: string;
  content: string;
  sourceType: string;       // NEWS | REPORT | SOCIAL | REGULATORY | FINANCIAL
  sourceUrl?: string;
  relevance: number;        // 0-1
  collectedAt: string;
  rawData?: Record<string, unknown>;
}

const FREQUENCY_MAP: Record<SignalFrequency, string> = {
  REALTIME: "every 5m",
  MINUTE: "every 5m",
  HOURLY: "hourly",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  ANNUAL: "monthly", // checked monthly, runs if >365 days since last
};

export function frequencyToSchedulerString(freq: SignalFrequency): string {
  return FREQUENCY_MAP[freq];
}

/**
 * Register a collection DAEMON process for a strategy
 */
export async function registerCollectionDaemon(
  config: CollectionStrategy,
): Promise<string> {
  // Check if daemon already exists for this strategy + frequency
  const existing = await db.process.findFirst({
    where: {
      strategyId: config.strategyId,
      type: "DAEMON",
      status: { in: ["RUNNING", "PAUSED"] },
      name: `market-collector-${config.frequency.toLowerCase()}`,
    },
  });

  // ADR-0037 PR-D — countryMeta is `Record<string, unknown>` which Prisma's
  // InputJsonValue rejects strict. Round-trip JSON to coerce to plain JSON.
  const playbookPayload = JSON.parse(JSON.stringify({
    type: "market_signal_collection",
    ...config,
  }));

  if (existing) {
    // Update config
    await db.process.update({
      where: { id: existing.id },
      data: { playbook: playbookPayload },
    });
    return existing.id;
  }

  const process = await db.process.create({
    data: {
      strategyId: config.strategyId,
      type: "DAEMON",
      name: `market-collector-${config.frequency.toLowerCase()}`,
      description: `Collecte signaux marché ${config.sector} — ${config.frequency}`,
      status: "RUNNING",
      frequency: frequencyToSchedulerString(config.frequency),
      priority: config.frequency === "REALTIME" ? 8 : config.frequency === "DAILY" ? 5 : 3,
      playbook: playbookPayload,
      nextRunAt: new Date(),
    },
  });

  return process.id;
}


// PR-K3-ter — sous-schéma validé (plus de JSON.parse brut). `.catch` borne les
// valeurs douteuses du 8B au lieu de laisser passer (relevance hors [0,1],
// sourceType inconnu) ou de tout jeter.
const SignalItemSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  sourceType: z.enum(["NEWS", "REPORT", "SOCIAL", "REGULATORY", "FINANCIAL"]).catch("REPORT"),
  relevance: z.number().min(0).max(1).catch(0.5),
  sourceUrl: z.string().optional(),
});
const SignalsResponseSchema = z.object({ signals: z.array(SignalItemSchema).max(8) });

interface SignalAxis { label: string; instruction: string }

/** Un appel focalisé sur UN axe de veille (2-3 signaux qualitatifs validés Zod). */
async function collectSignalAxis(config: CollectionStrategy, axis: SignalAxis): Promise<CollectedSignal[]> {
  const countryBlock = buildCountryContextPrompt(config);
  // LOT 1e — entrée non fiable neutralisée (anti-injection) : secteur, marché,
  // mots-clés et concurrents dérivent de la saisie fondateur (extraits des
  // piliers ADVE) → neutralisés inline. countryBlock vient de la table Country
  // (taxonomie interne).
  const sectorSafe = sanitizeInline(config.sector, { max: 120 });
  const marketSafe = config.market ? sanitizeInline(config.market, { max: 120 }) : "";
  const keywordsSafe = sanitizeInline(config.keywords.join(", "), { max: 600 });
  const competitorsSafe = sanitizeInline(config.competitors.join(", "), { max: 600 });
  const system = `${UNTRUSTED_NOTICE}

Tu es un analyste d'intelligence économique (veille sectorielle). Secteur "${sectorSafe}"${marketSafe ? ` — marché "${marketSafe}"` : ""}.
Mots-clés marque : ${keywordsSafe}
Concurrents : ${competitorsSafe}${countryBlock}

Tu produis des signaux QUALITATIFS plausibles pour ce secteur. N'INVENTE PAS de chiffres précis, de dates exactes ni d'URLs : décris des tendances/événements TYPES. Si tu n'es pas sûr, produis MOINS de signaux.

Format JSON STRICT : { "signals": [ { "title": "...", "content": "2-3 phrases", "sourceType": "NEWS|REPORT|SOCIAL|REGULATORY|FINANCIAL", "relevance": 0.0-1.0 } ] }`;
  try {
    const { text } = await callLLM({
      system,
      prompt: `Produis 2 à 3 signaux ${axis.instruction} pour le secteur "${sectorSafe}". JSON uniquement.`,
      caller: `signal-collector:${axis.label}`,
      strategyId: config.strategyId,
      maxOutputTokens: 1500,
    });
    const parsed = SignalsResponseSchema.safeParse(extractJSON(text));
    if (!parsed.success) return [];
    // collectedAt DÉTERMINISTE (horloge serveur) — jamais une date inventée par le LLM.
    const now = new Date().toISOString();
    return parsed.data.signals.map((s) => ({
      title: s.title,
      content: s.content,
      sourceType: s.sourceType,
      relevance: s.relevance,
      collectedAt: now,
      ...(s.sourceUrl ? { sourceUrl: s.sourceUrl } : {}),
    }));
  } catch {
    return [];
  }
}

/**
 * Execute one collection cycle — mega-appel (5-8 signaux, 4000 tokens) ÉCLATÉ en
 * 3 appels focalisés (tendances / réglementaire / concurrence) en parallèle :
 * le 8B traite mieux 2-3 signaux ciblés qu'un bloc de 8. Validation Zod, dates
 * déterministes, persistance en parallèle.
 */
export async function collectMarketSignals(config: CollectionStrategy): Promise<CollectedSignal[]> {
  const AXES: SignalAxis[] = [
    { label: "trends", instruction: "de TENDANCES de consommation / d'usage émergentes" },
    { label: "regulatory", instruction: "RÉGLEMENTAIRES ou macro-économiques" },
    { label: "competitive", instruction: "CONCURRENTIELS (mouvements des acteurs du secteur)" },
  ];
  const batches = await Promise.all(AXES.map((axis) => collectSignalAxis(config, axis)));
  const signals = batches.flat().slice(0, 10);

  await Promise.all(
    signals.map((signal) =>
      db.signal.create({
        data: {
          strategyId: config.strategyId,
          type: "EXTERNAL_SAAS",
          data: {
            title: signal.title,
            content: signal.content,
            sourceType: signal.sourceType,
            sourceUrl: signal.sourceUrl,
            relevance: signal.relevance,
            frequency: config.frequency,
          },
        },
      }),
    ),
  );

  return signals;
}

/**
 * List active collection daemons for a strategy
 */
export async function listCollectors(strategyId: string) {
  return db.process.findMany({
    where: {
      strategyId,
      type: "DAEMON",
      name: { startsWith: "market-collector-" },
      status: { in: ["RUNNING", "PAUSED"] },
    },
    orderBy: { priority: "desc" },
  });
}

/**
 * Stop a collection daemon
 */
export async function stopCollector(processId: string) {
  await db.process.update({
    where: { id: processId },
    data: { status: "STOPPED", nextRunAt: null },
  });
}
