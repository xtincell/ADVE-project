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
import { getFormatInstructions } from "@/lib/types/variable-bible";
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
    // ── Load data ──────────────────────────────────────────────────
    const pillar = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId, key: pillarKey } },
    });
    const currentContent = (pillar?.content ?? {}) as Record<string, unknown>;

    const allPillars = await db.pillar.findMany({ where: { strategyId } });
    const otherPillars: Record<string, Record<string, unknown>> = {};
    for (const p of allPillars) {
      if (p.key !== pillarKey) {
        otherPillars[p.key] = (p.content ?? {}) as Record<string, unknown>;
      }
    }

    const { text: vaultText, sourceCount } = await loadVault(strategyId);

    // ── Schema analysis ────────────────────────────────────────────
    const schemaKey = pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
    const schema = PILLAR_SCHEMAS[schemaKey];
    const shape = schema ? (schema as { shape?: Record<string, unknown> }).shape ?? {} : {};
    const allFieldKeys = Object.keys(shape);

    const isFld = (v: unknown) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
    const emptyFields = allFieldKeys.filter(k => !isFld(currentContent[k]));
    const filledFields = allFieldKeys.filter(k => isFld(currentContent[k]));

    if (emptyFields.length === 0 && sourceCount === 0) {
      return { pillarKey, recommendations: [], vaultSize: 0, error: "Aucune source dans le Vault. Ajoutez des documents ou URLs dans Sources pour enrichir ce pilier." };
    }

    // ── ÉTAPE 1 : Dérivation cross-pilier DÉTERMINISTE (zéro LLM) ──
    const crossDerived: Record<string, { value: unknown; source: string }> = {};

    // Table de correspondance : champ du pilier cible ← champ d'un autre pilier
    const CROSS_MAP: Record<string, Record<string, string>> = {
      a: { publicCible: "d.personas", promesseFondamentale: "d.positionnement", description: "a.noyauIdentitaire" },
      d: { archetypalExpression: "a.archetype", "assetsLinguistiques.languePrincipale": "a.langue" },
      v: { pricingJustification: "d.positionnement", personaSegmentMap: "d.personas" },
      e: { promesseExperience: "d.promesseMaitre", primaryChannel: "v.salesChannel" },
      r: { pillarGaps: "_calc" },
      t: { perceptionGap: "_calc" },
      i: { brandPlatform: "a.noyauIdentitaire+d.positionnement+d.promesseMaitre" },
      s: { visionStrategique: "a.prophecy" },
    };

    const crossMapForPillar = CROSS_MAP[pillarKey] ?? {};
    for (const emptyField of emptyFields) {
      const sourceRef = crossMapForPillar[emptyField];
      if (!sourceRef || sourceRef === "_calc") continue;

      // Parse "d.personas" → pillar d, field personas
      const parts = sourceRef.split("+")[0]!.split(".");
      const srcPillar = parts[0]!;
      const srcField = parts.slice(1).join(".");

      const srcContent = otherPillars[srcPillar];
      if (!srcContent) continue;

      const srcValue = srcField.includes(".") ? undefined : srcContent[srcField]; // Simple lookup
      if (!isFld(srcValue)) continue;

      // Derive a value based on the source
      let derivedValue: unknown;
      if (typeof srcValue === "string") {
        derivedValue = srcValue; // Direct copy for strings
      } else if (Array.isArray(srcValue) && srcValue.length > 0) {
        // For arrays, extract a summary
        const first = srcValue[0] as Record<string, unknown>;
        if (typeof first === "object" && first.name) {
          derivedValue = srcValue.map((item: Record<string, unknown>) => String(item.name ?? item.nom ?? "")).join(", ");
        } else {
          derivedValue = srcValue;
        }
      } else {
        derivedValue = srcValue;
      }

      if (derivedValue != null) {
        crossDerived[emptyField] = { value: derivedValue, source: `Derive de ${srcPillar.toUpperCase()}.${srcField}` };
      }
    }

    // ── ÉTAPE 2 : LLM CIBLÉ — scan intégral et méthodique ──────────
    //    Input ciblé : uniquement les champs non-résolus + contexte pertinent
    //    Pas de dump intégral — contexte structuré par pertinence
    const unresolvedEmpty = emptyFields.filter(k => !crossDerived[k]);
    const schemaFields = describeSchemaFields(pillarKey, currentContent);

    // Build a structured brief of ALL available data (other pillars + vault)
    const dataBrief: string[] = [];

    // Other pillars: list each field with value summary
    for (const [key, pContent] of Object.entries(otherPillars)) {
      const entries = Object.entries(pContent)
        .filter(([, v]) => isFld(v))
        .map(([k, v]) => {
          if (typeof v === "string") return `${k} = "${v.slice(0, 120)}"`;
          if (typeof v === "number") return `${k} = ${v}`;
          if (Array.isArray(v)) {
            const preview = v.slice(0, 2).map((item: unknown) => {
              if (typeof item === "string") return item.slice(0, 50);
              if (typeof item === "object" && item) {
                const o = item as Record<string, unknown>;
                return o.name ?? o.nom ?? o.action ?? o.title ?? Object.values(o)[0];
              }
              return String(item);
            }).join(", ");
            return `${k} = [${v.length} items: ${preview}${v.length > 2 ? "..." : ""}]`;
          }
          if (typeof v === "object" && v) return `${k} = {${Object.keys(v as Record<string, unknown>).join(", ")}}`;
          return `${k} = ${String(v).slice(0, 60)}`;
        });
      if (entries.length > 0) {
        dataBrief.push(`[${key.toUpperCase()}]\n${entries.join("\n")}`);
      }
    }

    // Vault text (full, not keyword-extracted)
    if (vaultText.length > 0) {
      dataBrief.push(`[VAULT — ${sourceCount} source(s)]\n${vaultText.slice(0, 6000)}`);
    }

    // Mestor scan — intégral et méthodique
    const result = await callLLMAndParse({
      system: `Tu es le Commandant MESTOR. Tu fais un AUDIT INTEGRAL du pilier ${pillarKey.toUpperCase()}.

METHODE : Pour CHAQUE variable du pilier (listees ci-dessous avec type et statut), tu fais :
1. Si VIDE : cherche dans les AUTRES PILIERS et le VAULT une information pour la remplir
2. Si REMPLI : verifie que la valeur est coherente avec les autres piliers et le vault
3. Si ameliorable : propose une modification
4. Si correcte : ne la mentionne PAS

SOURCES (par ordre de fiabilite) :
- Les 7 AUTRES PILIERS sont ta source principale (donnees deja validees)
- Le VAULT (sources brutes) est ta source secondaire
- Cite TOUJOURS ta source : "Derive de D.positionnement" ou "Source vault: interview client"

REGLES DE FORMAT :
- (string) → proposedValue = une string
- (array) → proposedValue = UN SEUL item a ajouter (pas le tableau)
- (object) → proposedValue = un objet avec les sous-champs attendus
- (number) → proposedValue = un nombre

Retourne un JSON array :
{
  "field": "nom_du_champ",
  "operation": "SET" | "ADD" | "MODIFY" | "EXTEND",
  "currentSummary": "valeur actuelle resumee ou 'Vide'",
  "proposedValue": <RESPECTE LE TYPE DU SCHEMA>,
  "justification": "Source du vault qui justifie + raisonnement",
  "impact": "HIGH" (champ vide) | "MEDIUM" (challenge) | "LOW" (confirm),
  "verdict": "ADD" (champ vide) | "CHALLENGE" | "INFIRM" | "CONFIRM"
}

Produis au moins 1 reco par champ VIDE. Cite toujours la source.`,
      prompt: `=== VARIABLES DU PILIER ${pillarKey.toUpperCase()} (type + statut) ===
${schemaFields}

=== CONTENU ACTUEL DU PILIER ${pillarKey.toUpperCase()} ===
${JSON.stringify(currentContent, null, 2).slice(0, 3000)}

=== DONNÉES DISPONIBLES (autres piliers + vault) ===
${dataBrief.join("\n\n").slice(0, 10000)}

${unresolvedEmpty.length > 0 ? `\nCHAMPS PRIORITAIRES A REMPLIR : ${unresolvedEmpty.join(", ")}` : ""}
${filledFields.length > 0 ? `\nCHAMPS A VERIFIER (ameliorables ?) : ${filledFields.slice(0, 15).join(", ")}` : ""}

=== BIBLE DE FORMAT (respecte EXACTEMENT ces formats pour chaque proposedValue) ===
${getFormatInstructions(pillarKey, [...unresolvedEmpty, ...filledFields.slice(0, 10)])}

Scan integral — pour chaque champ vide, propose une valeur derivee des donnees disponibles.
Pour chaque champ rempli, verifie la coherence et propose une amelioration si justifie.
RESPECTE LE FORMAT DE LA BIBLE pour chaque proposedValue.`,
      maxTokens: 6000,
      strategyId,
      caller: `vault-enrichment:${pillarKey}`,
    });

    const llmRecos = (Array.isArray(result) ? result : (result as Record<string, unknown>).recommendations ?? []) as VaultRecommendation[];

    // Prepend cross-derived recos (étape 1, deterministic, highest confidence)
    const crossRecos: VaultRecommendation[] = Object.entries(crossDerived).map(([field, { value, source }]) => ({
      field,
      operation: "SET" as const,
      currentSummary: "Vide",
      proposedValue: value,
      justification: source,
      source: "VAULT" as const,
      impact: "HIGH" as const,
      verdict: "ADD" as const,
    }));

    const recos = [...crossRecos, ...llmRecos];

    // Sanitize: ensure operation is always set + tag source
    for (const r of recos) {
      r.source = "VAULT";
      // Fix missing operation — infer from context
      if (!r.operation) {
        if (r.verdict === "ADD") {
          r.operation = "SET"; // Default ADD verdict to SET (fill empty field)
        } else if (r.verdict === "CHALLENGE" || r.verdict === "INFIRM") {
          r.operation = "SET";
        } else {
          r.operation = "SET";
        }
      }
    }

    // Validate each reco's proposedValue against the Zod schema field type
    if (schema) {
      const shape = (schema as { shape?: Record<string, { safeParse?: (v: unknown) => { success: boolean } }> }).shape ?? {};
      for (const reco of recos) {
        const fieldSchema = shape[reco.field];
        if (fieldSchema?.safeParse && reco.proposedValue !== undefined) {
          const validation = fieldSchema.safeParse(reco.proposedValue);
          if (!validation.success) {
            // Try coercion: if schema expects string and we have array → join
            if (Array.isArray(reco.proposedValue)) {
              const joined = reco.proposedValue.map((v: unknown) => typeof v === "string" ? v : JSON.stringify(v)).join(", ");
              const retry = fieldSchema.safeParse(joined);
              if (retry.success) {
                reco.proposedValue = joined;
              } else {
                (reco as unknown as Record<string, unknown>).validationWarning = "Format incorrect — sera coerce a l'application";
              }
            }
          }
        }
      }
    }

    // Store as pendingRecos on the pillar (type-validated)
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
