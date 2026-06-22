/**
 * Structured LLM Call (Phase 21 — F-A2)
 *
 * Wrapper qui rend toute génération LLM CONFORME à un schéma Zod imposé,
 * avec retry automatique sur échec de validation. C'est la mécanique
 * verrouillée que les Glory tools / frameworks Artemis / vault-enrichment
 * doivent emprunter au lieu de construire leur prompt + extractJSON
 * artisanalement (cf. ADR-0067).
 *
 * Pipeline en 5 étapes :
 *   1. Sérialiser `schema` en JSON Schema 7 (helper deriveJsonSchemaFromZod).
 *   2. Enrichir le system prompt avec :
 *        - directive "Réponds UNIQUEMENT en JSON valide"
 *        - JSON Schema embedded (le LLM voit la shape exacte)
 *        - exemples / format instructions optionnels
 *   3. callLLM (responseFormat='json_object' si provider le supporte).
 *   4. parseAndValidateLLM mode 'strict' → throw LLMValidationError si non
 *      conforme.
 *   5. Si throw : retry x N (default 2) en injectant les Zod issues dans le
 *      prompt de retry pour donner feedback au LLM.
 *
 * Erreur finale : `LLMStructuredCallError` (extends LLMValidationError) avec
 * historique des tentatives + dernier raw output.
 */

import type { ZodType } from "zod";
import { callLLM, type GatewayPurpose } from "@/server/services/llm-gateway";
import {
  parseAndValidateLLM,
  LLMValidationError,
  type LLMValidationResult,
} from "@/server/services/llm-gateway/parse-validate";
import {
  deriveJsonSchemaFromZod,
  jsonSchemaToPromptBlock,
  type JsonSchema7,
} from "./zod-to-json-schema";

export interface StructuredLLMOptions<T> {
  /** System prompt — la directive "Réponds en JSON" est ajoutée automatiquement. */
  system: string;
  /** User prompt. */
  prompt: string;
  /** Schéma Zod attendu en sortie (validation strict). */
  schema: ZodType<T>;
  /** Caller tag pour cost tracking. */
  caller: string;
  /** Strategy ID pour budget gating. */
  strategyId?: string;
  /** Purpose Gateway (default 'agent'). */
  purpose?: GatewayPurpose;
  /**
   * Override du modèle Ollama pour CET appel structuré. À défaut, lit l'env
   * `OLLAMA_STRUCTURED_MODEL` (ex: `hermes3-fast` 16K ctx, full GPU) ; sinon le
   * modèle de la ModelPolicy (`hermes3-ctx` 64K, qui spille sur CPU → ~5× plus
   * lent). Les appels structurés (Oracle, frameworks, glory tools) ont un
   * schéma + contexte volumineux + 4K de sortie → un modèle 4K tronquerait,
   * d'où un modèle à contexte intermédiaire dédié. Ignoré hors provider Ollama.
   */
  ollamaModel?: string;
  /** Max output tokens (default 6000). */
  maxOutputTokens?: number;
  /** Nombre de retries sur échec Zod (default 2). Total = 1 + retries calls. */
  retries?: number;
  /** Description top-level du schéma pour le prompt (optionnel). */
  schemaTitle?: string;
  /** Description supplémentaire injectée à côté du schéma (ex: getFormatInstructions). */
  formatInstructions?: string;
  /** Mode 'strict' (default) ou 'prune' — strict = pas de tolérance. */
  validationMode?: "strict" | "prune";
  /** Callback warnings parseAndValidateLLM (mode prune uniquement). */
  onWarning?: (w: { context: string; path: string; message: string }) => void;
}

export interface StructuredLLMResult<T> {
  /** Donnée parsée + validée. */
  data: T;
  /** Texte LLM brut de la dernière tentative réussie. */
  rawText: string;
  /** Nombre de tentatives effectuées (1 = succès du premier coup). */
  attempts: number;
  /** Warnings cumulés (mode prune). */
  warnings: string[];
  /** Paths droppés (mode prune). */
  droppedPaths: string[];
  /** Vrai si le parse a fait du pruning. */
  partial: boolean;
}

export class LLMStructuredCallError extends Error {
  override readonly name = "LLMStructuredCallError";
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly history: Array<{ rawText: string; error: string; issues?: unknown }>,
    public readonly lastRaw: unknown,
  ) {
    super(message);
  }
}

/**
 * Le contrat d'exécution :
 *   - Si succès du premier coup → 1 call LLM, 0 warning, partial=false.
 *   - Si échec Zod → retry avec feedback enrichi des issues, jusqu'à
 *     `1 + retries` tentatives.
 *   - Si toutes les tentatives échouent → throw `LLMStructuredCallError`.
 */
export async function executeStructuredLLMCall<T>(
  options: StructuredLLMOptions<T>,
): Promise<StructuredLLMResult<T>> {
  const retries = options.retries ?? 2;
  const validationMode = options.validationMode ?? "strict";
  const jsonSchema = deriveJsonSchemaFromZod(options.schema, {
    title: options.schemaTitle,
  });
  const baseSystem = enrichSystemWithSchema(options.system, jsonSchema, options.formatInstructions);

  const history: Array<{ rawText: string; error: string; issues?: unknown }> = [];
  let lastRaw: unknown = null;
  let userPrompt = options.prompt;

  for (let attempt = 1; attempt <= 1 + retries; attempt++) {
    const { text } = await callLLM({
      system: baseSystem,
      prompt: userPrompt,
      caller: `${options.caller}:struct${attempt > 1 ? `:retry${attempt - 1}` : ""}`,
      strategyId: options.strategyId,
      purpose: options.purpose,
      // Modèle Ollama rapide pour les appels structurés (Oracle inclus) —
      // override par appel > env OLLAMA_STRUCTURED_MODEL > modèle ModelPolicy.
      ollamaModel: options.ollamaModel ?? process.env.OLLAMA_STRUCTURED_MODEL,
      maxOutputTokens: options.maxOutputTokens,
      // F-A3 — Demande au gateway de forcer json_object si provider supporte
      // (OpenAI / Ollama). Pour Anthropic, le system prompt enrichi A2 garantit
      // déjà la contrainte stricte.
      responseFormat: "json_object",
    });
    lastRaw = text;

    try {
      const result: LLMValidationResult<T> = parseAndValidateLLM(text, options.schema, {
        context: options.caller,
        mode: validationMode,
        onWarning: options.onWarning,
      });
      return {
        data: result.data,
        rawText: text,
        attempts: attempt,
        warnings: result.warnings,
        droppedPaths: result.droppedPaths,
        partial: result.partial,
      };
    } catch (err) {
      const issues = err instanceof LLMValidationError ? err.issues : undefined;
      const errorMessage = err instanceof Error ? err.message : String(err);
      history.push({ rawText: text, error: errorMessage, issues });

      if (attempt === 1 + retries) break;

      // Build feedback prompt for the next retry: include Zod issues so the
      // LLM knows EXACTLY what failed.
      userPrompt = buildRetryPrompt(options.prompt, text, errorMessage, issues);
    }
  }

  throw new LLMStructuredCallError(
    `[${options.caller}] LLM output failed Zod validation after ${1 + retries} attempts.`,
    1 + retries,
    history,
    lastRaw,
  );
}

// ── Internals ───────────────────────────────────────────────────────────

function enrichSystemWithSchema(
  baseSystem: string,
  jsonSchema: JsonSchema7,
  formatInstructions: string | undefined,
): string {
  const schemaBlock = jsonSchemaToPromptBlock(jsonSchema);
  const blocks = [
    baseSystem.trim(),
    "",
    "=== CONTRAT DE SORTIE STRICT ===",
    "Tu DOIS répondre UNIQUEMENT en JSON valide, conforme EXACTEMENT au schéma ci-dessous.",
    "Aucun texte avant ou après le JSON. Aucun commentaire markdown. Aucun bloc ```json```.",
    "Tout champ marqué `required` DOIT être présent. Aucun champ supplémentaire (additionalProperties=false).",
    "Toute déviation entraînera un rejet et un retry — sois rigoureux.",
    "",
    "=== JSON SCHEMA (Draft 7) ===",
    schemaBlock,
  ];
  if (formatInstructions && formatInstructions.trim().length > 0) {
    blocks.push("", "=== INSTRUCTIONS DE FORMAT (Variable Bible) ===", formatInstructions.trim());
  }
  return blocks.join("\n");
}

function buildRetryPrompt(
  originalPrompt: string,
  previousOutput: string,
  errorMessage: string,
  issues: unknown,
): string {
  const issuesText = formatIssues(issues);
  return [
    originalPrompt,
    "",
    "=== TENTATIVE PRÉCÉDENTE REJETÉE ===",
    "Ta réponse précédente n'a pas respecté le schéma. Voici les violations détectées :",
    "",
    issuesText,
    "",
    "Erreur résumée : " + errorMessage,
    "",
    "Corrige ta réponse en respectant EXACTEMENT le schéma. Réponds UNIQUEMENT en JSON valide.",
    "Ne renvoie pas le texte précédent — produis une nouvelle sortie corrigée.",
  ].join("\n");
}

function formatIssues(issues: unknown): string {
  if (!Array.isArray(issues)) return "(détails non disponibles)";
  const list = issues as Array<{ path?: ReadonlyArray<unknown>; message?: string }>;
  return list
    .slice(0, 10)
    .map((iss, idx) => {
      const path = Array.isArray(iss.path) && iss.path.length > 0 ? iss.path.map((p) => String(p)).join(".") : "<root>";
      return `${idx + 1}. ${path} — ${iss.message ?? "violation"}`;
    })
    .join("\n");
}
