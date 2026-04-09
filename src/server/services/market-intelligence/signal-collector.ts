/**
 * Signal Collector — Multi-frequency market data collection
 * Frequencies: REALTIME → MINUTE → HOURLY → DAILY → WEEKLY → MONTHLY → ANNUAL
 * Each frequency registers a Process DAEMON that the cron scheduler picks up.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";

export type SignalFrequency =
  | "REALTIME" | "MINUTE" | "HOURLY" | "DAILY"
  | "WEEKLY" | "MONTHLY" | "ANNUAL";

export interface CollectionStrategy {
  strategyId: string;
  sector: string;
  market?: string;
  keywords: string[];
  competitors: string[];
  frequency: SignalFrequency;
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

  if (existing) {
    // Update config
    await db.process.update({
      where: { id: existing.id },
      data: {
        playbook: {
          type: "market_signal_collection",
          ...config,
        },
      },
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
      playbook: {
        type: "market_signal_collection",
        ...config,
      },
      nextRunAt: new Date(),
    },
  });

  return process.id;
}

/**
 * Execute one collection cycle — gather market signals via LLM analysis
 */
export async function collectMarketSignals(
  config: CollectionStrategy,
): Promise<CollectedSignal[]> {
  const systemPrompt = `Tu es un analyste d'intelligence économique spécialisé dans la veille sectorielle.
Ton rôle : identifier les signaux de marché pertinents pour une marque dans le secteur "${config.sector}"${config.market ? ` sur le marché "${config.market}"` : ""}.

Mots-clés de la marque : ${config.keywords.join(", ")}
Concurrents identifiés : ${config.competitors.join(", ")}

Tu dois produire des signaux RÉALISTES et DATÉS basés sur les tendances actuelles du secteur.
Chaque signal doit être un événement, une tendance, ou une donnée qui pourrait impacter la marque.

Format JSON strict — tableau de signaux :
[{
  "title": "Titre court du signal",
  "content": "Description détaillée de l'événement/tendance (2-3 phrases)",
  "sourceType": "NEWS | REPORT | SOCIAL | REGULATORY | FINANCIAL",
  "relevance": 0.0-1.0,
  "collectedAt": "ISO date string"
}]`;

  const result = await callLLM({
    system: systemPrompt,
    prompt: `Génère 5-8 signaux de marché actuels et réalistes pour le secteur "${config.sector}". Concentre-toi sur les événements récents, tendances émergentes, et changements réglementaires qui pourraient impacter une marque de ce secteur. JSON uniquement.`,
    caller: "signal-collector:collect",
    strategyId: config.strategyId,
    maxTokens: 4000,
  });

  try {
    const match = result.text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const signals = JSON.parse(match[0]) as CollectedSignal[];

    // Persist each signal in DB
    for (const signal of signals) {
      await db.signal.create({
        data: {
          strategyId: config.strategyId,
          type: "MARKET_SIGNAL",
          data: {
            title: signal.title,
            content: signal.content,
            sourceType: signal.sourceType,
            sourceUrl: signal.sourceUrl,
            relevance: signal.relevance,
            frequency: config.frequency,
          },
        },
      });
    }

    return signals;
  } catch {
    console.warn("[signal-collector] Failed to parse signals");
    return [];
  }
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
