/**
 * VAULT ENRICHMENT — Scan du vault BrandDataSource pour enrichir les piliers
 *
 * Le vault contient TOUTES les données brutes de la marque :
 *   - Résultats d'intake (formulaire)
 *   - Notes manuelles de l'opérateur
 *   - Documents uploadés (PDF, DOCX parsés)
 *   - Données CRM synchronisées
 *
 * Le bouton "Enrichir" charge TOUT le vault, scanne TOUTES les variables
 * du pilier ciblé, et produit des recommandations :
 *   - CONFIRMER : la source valide la valeur actuelle
 *   - CHALLENGER : la source suggère une alternative
 *   - INFIRMER : la source contredit la valeur actuelle
 *   - AJOUTER : la source contient une info absente du pilier
 *
 * Traitement ON-DEMAND (pas automatique) pour charger le contexte complet.
 */

import { db } from "@/lib/db";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import { callLLMAndParse } from "@/server/services/utils/llm";
import type { PillarKey } from "@/lib/types/advertis-vector";
import type { Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export interface VaultRecommendation {
  field: string;
  operation: "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND";
  currentSummary: string;
  proposedValue: unknown;
  targetMatch?: { key: string; value: string };
  justification: string;
  source: "VAULT";
  impact: "LOW" | "MEDIUM" | "HIGH";
  verdict: "CONFIRM" | "CHALLENGE" | "INFIRM" | "ADD";
}

export interface VaultEnrichmentResult {
  pillarKey: string;
  recommendations: VaultRecommendation[];
  vaultSize: number; // nombre de sources chargées
  error?: string;
}

// ── Load full vault ───────────────────────────────────────────────────

async function loadVault(strategyId: string): Promise<{ text: string; sourceCount: number }> {
  const sources = await db.brandDataSource.findMany({
    where: {
      strategyId,
      processingStatus: { in: ["EXTRACTED", "PROCESSED"] },
    },
    select: {
      fileName: true,
      sourceType: true,
      rawContent: true,
      rawData: true,
      extractedFields: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (sources.length === 0) return { text: "", sourceCount: 0 };

  // Compile ALL sources into a single context block
  const blocks: string[] = [];
  for (const source of sources) {
    const header = `[SOURCE: ${source.fileName ?? source.sourceType} — ${source.createdAt.toLocaleDateString("fr")}]`;

    const parts: string[] = [header];

    // Raw text content (intake answers, notes, parsed documents)
    if (source.rawContent) {
      parts.push(source.rawContent);
    }

    // Structured extracted fields
    if (source.extractedFields && typeof source.extractedFields === "object") {
      const fields = source.extractedFields as Record<string, unknown>;
      const fieldLines = Object.entries(fields)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `  ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
      if (fieldLines.length > 0) {
        parts.push("Champs extraits:\n" + fieldLines.join("\n"));
      }
    }

    // Raw data (JSON responses)
    if (source.rawData && typeof source.rawData === "object" && !source.rawContent) {
      const data = source.rawData as Record<string, unknown>;
      const dataLines = Object.entries(data)
        .filter(([, v]) => v != null && v !== "")
        .slice(0, 30) // Limit to avoid token overflow
        .map(([k, v]) => `  ${k}: ${typeof v === "string" ? v.slice(0, 200) : JSON.stringify(v).slice(0, 200)}`);
      if (dataLines.length > 0) {
        parts.push("Donnees:\n" + dataLines.join("\n"));
      }
    }

    blocks.push(parts.join("\n"));
  }

  return { text: blocks.join("\n\n---\n\n"), sourceCount: sources.length };
}

// ── Describe schema fields ────────────────────────────────────────────

function describeSchemaFields(pillarKey: string, currentContent: Record<string, unknown>): string {
  const schemaKey = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[schemaKey];
  if (!schema) return "Schema non disponible";

  const shape = (schema as { shape?: Record<string, unknown> }).shape ?? {};
  const isFilled = (v: unknown) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);

  return Object.entries(shape).map(([fieldName, fieldSchema]) => {
    const def = (fieldSchema as { _def?: { typeName?: string; innerType?: { _def?: { typeName?: string } } } })?._def;
    const typeName = def?.typeName ?? "unknown";

    // Determine type label
    let typeLabel = "unknown";
    if (typeName.includes("ZodString")) typeLabel = "string";
    else if (typeName.includes("ZodNumber")) typeLabel = "number";
    else if (typeName.includes("ZodArray")) typeLabel = "array";
    else if (typeName.includes("ZodObject")) typeLabel = "object";
    else if (typeName.includes("ZodEnum")) typeLabel = "enum";
    else if (typeName.includes("ZodOptional")) {
      const inner = def?.innerType?._def?.typeName ?? "";
      if (inner.includes("Array")) typeLabel = "array (optional)";
      else if (inner.includes("Object")) typeLabel = "object (optional)";
      else if (inner.includes("String")) typeLabel = "string (optional)";
      else if (inner.includes("Number")) typeLabel = "number (optional)";
      else typeLabel = `${inner.replace("Zod", "").toLowerCase()} (optional)`;
    } else if (typeName.includes("ZodUnion")) typeLabel = "string | object";

    // Check if filled or empty
    const value = currentContent[fieldName];
    const status = isFilled(value) ? "REMPLI" : "VIDE";
    const currentPreview = isFilled(value)
      ? (typeof value === "string" ? `"${value.slice(0, 60)}"` : Array.isArray(value) ? `[${value.length} items]` : typeof value === "object" ? "{...}" : String(value))
      : "—";

    return `- ${fieldName} (${typeLabel}) [${status}] ${status === "REMPLI" ? `= ${currentPreview}` : "← A REMPLIR"}`;
  }).join("\n");
}

// ── Main API ──────────────────────────────────────────────────────────

/**
 * Scan the full vault and produce recommendations for a specific pillar.
 * Loads ALL BrandDataSource → compares against current pillar content →
 * produces per-field recommendations (CONFIRM/CHALLENGE/INFIRM/ADD).
 */
export async function enrichFromVault(
  strategyId: string,
  pillarKey: PillarKey,
): Promise<VaultEnrichmentResult> {
  try {
    // 1. Load full vault
    const { text: vaultText, sourceCount } = await loadVault(strategyId);

    if (sourceCount === 0) {
      return {
        pillarKey,
        recommendations: [],
        vaultSize: 0,
        error: "Aucune source dans le vault. Ajoutez des notes ou documents dans l'onglet Sources.",
      };
    }

    // 2. Load current pillar content
    const pillar = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId, key: pillarKey } },
    });
    const currentContent = (pillar?.content ?? {}) as Record<string, unknown>;

    // 3. Load all other pillars for cross-context
    const allPillars = await db.pillar.findMany({ where: { strategyId } });
    const otherPillarsContext = allPillars
      .filter(p => p.key !== pillarKey)
      .map(p => `[${p.key.toUpperCase()}] ${JSON.stringify(p.content, null, 2).slice(0, 1000)}`)
      .join("\n\n");

    // 4. Get schema fields for this pillar (with types + fill status)
    const schemaFields = describeSchemaFields(pillarKey, currentContent);

    // 5. Mestor scans vault vs current content → produces recos
    const result = await callLLMAndParse({
      system: `Tu es le Commandant MESTOR. On te donne :
1. Le VAULT complet de la marque (toutes les sources brutes : notes, intake, documents)
2. Le contenu ACTUEL du pilier ${pillarKey.toUpperCase()}
3. Les VARIABLES ATTENDUES du pilier avec leur TYPE et leur STATUT (REMPLI ou VIDE)
4. Le contexte des autres piliers

Tu dois traiter TOUS les champs — vides ET remplis :

CHAMPS VIDES (marques "← A REMPLIR") :
  Cherche dans le vault et les autres piliers une information pour les remplir.
  verdict = "ADD", operation = "SET" (pour string/number/object) ou "ADD" (pour array item)

CHAMPS REMPLIS (marques "[REMPLI]") :
  Verifie si le vault contient une info MEILLEURE, plus precise, ou contradictoire.
  Si oui : verdict = "CHALLENGE" ou "INFIRM", operation = "SET" ou "MODIFY"
  Si le champ est incomplet (ex: un array avec 2 items qui pourrait en avoir 5) : verdict = "CHALLENGE", operation = "ADD"
  Si le champ est bon : ne le mentionne PAS (pas de reco CONFIRM inutile)

REGLES DE FORMAT CRITIQUES :
- Si le schema dit "(string)" → proposedValue DOIT etre une string, pas un array ni un objet
- Si le schema dit "(array)" → proposedValue DOIT etre un SEUL item a ajouter (pas le tableau complet)
- Si le schema dit "(object)" → proposedValue DOIT etre un objet avec les sous-champs requis
- Si le schema dit "(number)" → proposedValue DOIT etre un nombre
- Pour les operations ADD sur un array → proposedValue = UN SEUL nouvel item
- Pour les operations SET sur un string → proposedValue = la string complete

Retourne un JSON array. Chaque item :
{
  "field": "nom_du_champ",
  "operation": "SET" (pour string/number/object vide) | "ADD" (pour ajouter a un array) | "MODIFY" | "EXTEND",
  "currentSummary": "resume actuel (20 mots max) ou 'Vide'",
  "proposedValue": <RESPECTE LE TYPE DU SCHEMA>,
  "justification": "Source du vault qui justifie + raisonnement",
  "impact": "HIGH" (champ vide) | "MEDIUM" (challenge) | "LOW" (confirm),
  "verdict": "ADD" (champ vide) | "CHALLENGE" | "INFIRM" | "CONFIRM"
}

Produis au moins 1 reco par champ VIDE si le vault ou les autres piliers contiennent l'info.`,
      prompt: `=== VAULT DE LA MARQUE (${sourceCount} sources) ===
${vaultText.slice(0, 12000)}

=== PILIER ${pillarKey.toUpperCase()} — CONTENU ACTUEL ===
${JSON.stringify(currentContent, null, 2).slice(0, 4000)}

=== VARIABLES ATTENDUES DU PILIER ${pillarKey.toUpperCase()} ===
${schemaFields}

=== CONTEXTE AUTRES PILIERS ===
${otherPillarsContext.slice(0, 3000)}

Produis les recommandations d'enrichissement basees sur le vault.
Ne propose RIEN qui ne soit pas justifie par une source du vault.`,
      maxTokens: 6000,
      strategyId,
    }, `vault-enrichment:${pillarKey}`);

    const recos = (Array.isArray(result) ? result : (result as Record<string, unknown>).recommendations ?? []) as VaultRecommendation[];

    // Tag all with source: "VAULT"
    for (const r of recos) {
      r.source = "VAULT";
    }

    // Store as pendingRecos on the pillar
    if (recos.length > 0) {
      await db.pillar.update({
        where: { strategyId_key: { strategyId, key: pillarKey } },
        data: { pendingRecos: recos as unknown as Prisma.InputJsonValue },
      });
    }

    return { pillarKey, recommendations: recos, vaultSize: sourceCount };
  } catch (err) {
    return {
      pillarKey,
      recommendations: [],
      vaultSize: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Scan vault for ALL 8 pillars at once. Returns summary of recos per pillar.
 */
export async function enrichAllFromVault(
  strategyId: string,
): Promise<Record<string, VaultEnrichmentResult>> {
  const results: Record<string, VaultEnrichmentResult> = {};

  for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"] as PillarKey[]) {
    results[key] = await enrichFromVault(strategyId, key);
  }

  return results;
}
