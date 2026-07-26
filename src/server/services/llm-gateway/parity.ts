/**
 * llm-gateway/parity — garde-fous de parité par modèle, PARTAGÉS entre les
 * surfaces du Gateway (callLLM + streamChatText).
 *
 * Migration Sonnet 5 (RESIDUAL-DEBT ADR-0143 suite) — parité de comportement :
 * Sonnet 5 pense par défaut quand `thinking` est omis (troncature possible sur
 * maxOutputTokens court) et rejette une `temperature` non-défaut en 400. On
 * préserve le comportement 4.x sur TOUTES les surfaces — c'est précisément
 * l'oubli de ce garde-fou sur `/api/chat` (appel provider direct hors Gateway)
 * qui tronquait/vidait les réponses du chat cockpit (ADR-0179).
 *
 * Module feuille volontaire (zéro import) — consommable par index.ts et
 * streaming.ts sans cycle.
 */

export interface Sonnet5ParityInput {
  provider: string;
  /** Nom de modèle Anthropic résolu (police ou override). */
  model: string;
  /** providerOptions déjà construites en amont (ex. responseFormat json). */
  baseProviderOptions?: Record<string, unknown>;
  temperature?: number;
}

export interface Sonnet5ParityOutput {
  providerOptions?: Record<string, unknown>;
  temperature?: number;
}

/** Vrai ssi l'appel part vers Anthropic avec un modèle Sonnet 5. */
export function isAnthropicSonnet5(provider: string, model: string): boolean {
  return provider === "anthropic" && model.startsWith("claude-sonnet-5");
}

/**
 * Applique la parité Sonnet 5 : thinking désactivé + température strippée
 * quand (provider=anthropic, modèle=claude-sonnet-5*). Pass-through sinon.
 */
export function applySonnet5Parity(input: Sonnet5ParityInput): Sonnet5ParityOutput {
  if (!isAnthropicSonnet5(input.provider, input.model)) {
    return { providerOptions: input.baseProviderOptions, temperature: input.temperature };
  }
  return {
    providerOptions: {
      ...(input.baseProviderOptions ?? {}),
      anthropic: { thinking: { type: "disabled" as const } },
    },
    temperature: undefined,
  };
}
