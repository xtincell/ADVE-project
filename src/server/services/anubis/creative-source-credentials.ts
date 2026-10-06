/** Credentials Vault connection tests, never a corpus import. */
import { db } from "@/lib/db";
import { fetchCreativeSource, readBoundedJson } from "@/server/services/seshat/creative-intelligence/source-adapters";
import { studioEndpoint } from "@/server/services/seshat/argos/studio-client";
import { z } from "zod";

export async function testCreativeSourceCredential(operatorId: string, connectorType: string): Promise<{ success: boolean; reason?: string }> {
  const row = await db.externalConnector.findUnique({ where: { operatorId_connectorType: { operatorId, connectorType } }, select: { config: true } });
  const config = row?.config as Record<string, unknown> | null;
  if (!config) return { success: false, reason: "Aucun credential enregistré." };
  try {
    if (connectorType === "argos-studio") {
      if (typeof config.baseUrl !== "string") return { success: false, reason: "URL publique Argos-studio requise." };
      const endpoint = await studioEndpoint(config.baseUrl);
      const response = await fetch(endpoint, { redirect: "error", signal: AbortSignal.timeout(10000), headers: typeof config.apiKey === "string" && config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined });
      const contract = z.object({ schemaVersion: z.literal("research-dossier-v1"), method: z.literal("POST") }).safeParse(await readBoundedJson(response, 50000));
      return contract.success ? { success: true, reason: "Contrat GET vérifié ; l'autorisation POST sera vérifiée lors d'une projection réelle." } : { success: false, reason: "Contrat Argos-studio incompatible." };
    }
    if (typeof config.apiKey !== "string" || !config.apiKey.trim()) return { success: false, reason: "Clé API requise." };
    const result = await fetchCreativeSource({ provider: connectorType === "youtube-data" ? "YOUTUBE" : "FOREPLAY", account: connectorType === "youtube-data" ? "@YouTube" : "", sector: "credential-test", countryCode: "CI", limit: 1, youtubeFormat: "LONG_VIDEO" }, { apiKey: config.apiKey });
    return result.state === "LIVE" || result.state === "DEGRADED" && result.reason === "INSUFFICIENT_DATA" ? { success: true } : { success: false, reason: result.state === "DEGRADED" ? result.reason : "Clé manquante." };
  } catch { return { success: false, reason: "Connexion externe indisponible ou endpoint refusé." }; }
}
