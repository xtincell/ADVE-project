/**
 * llm-gateway/router.ts — CATALOGUE D'AFFICHAGE des modèles, rien d'autre.
 *
 * ## Ce module ne route pas
 *
 * La vraie cascade de providers vit dans `llm-gateway/index.ts` :
 * `buildTextProviderCandidates` → `resolveTextProviderOrder` → `isPremiumMode`.
 * Architecture opérateur 2026-07-16 : **Ollama Cloud primaire** (gratuit /
 * forfaitaire), **OpenRouter repli**, **Anthropic dernier recours** — le chemin
 * nominal ne touche aucun crédit payant. `LLM_PREMIUM_MODE=1` inverse et promeut
 * Anthropic ; `LLM_PRIMARY_PROVIDER` gagne sur les deux.
 *
 * Ce fichier ne sert plus qu'à `listAvailableModels()`, consommé par la page
 * publique `/status` pour afficher quels providers sont configurés.
 *
 * ## Historique (nettoyage 2026-07-27)
 *
 * Il portait une « matrice de routage v5 » (tier S → Opus, A → Sonnet, Ollama en
 * « tier C cheap/on-prem ») **contredisant la doctrine réelle**, sans aucun
 * appelant — et un test de gouvernance la certifiait, donnant l'illusion que le
 * routage était sous garde. Un second module mort, `router/index.ts`, portait une
 * troisième matrice, structurellement inatteignable (`router.ts` l'occulte dans
 * la résolution de module). Les deux matrices ont été retirées ; le test guarde
 * désormais la cascade réelle (`llm-routing.test.ts`).
 */

export interface ModelChoice {
  /** Provider — "anthropic" | "openai" | "ollama" | "openrouter". */
  readonly provider: string;
  /** Model name. */
  readonly model: string;
  /** Approximate cost per 1M input tokens (USD). */
  readonly costPerMTokensUsd: number;
  /** Typical p50 latency for a 2k-token prompt (ms). */
  readonly typicalLatencyMs: number;
  /** Whether the model is currently available (configured + health-checked). */
  readonly available: boolean;
}

function hasEnv(key: string): boolean {
  return typeof process !== "undefined" && Boolean(process.env[key]);
}

/**
 * Catalogue d'affichage, **dans l'ordre de la cascade réelle** (cf. en-tête) —
 * et non dans un ordre de « qualité » inventé. Le modèle Ollama servi est piloté
 * par `OLLAMA_MODEL` en prod : le catalogue affiche la valeur effective, pas une
 * constante figée qui mentirait dès le premier changement de modèle.
 */
function catalog(): ModelChoice[] {
  return [
    {
      provider: "ollama",
      model: process.env.OLLAMA_MODEL ?? "(défini par OLLAMA_MODEL)",
      costPerMTokensUsd: 0,
      typicalLatencyMs: 2500,
      available: hasEnv("OLLAMA_BASE_URL"),
    },
    {
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL ?? "(défini par OPENROUTER_MODEL)",
      costPerMTokensUsd: 0,
      typicalLatencyMs: 3000,
      available: hasEnv("OPENROUTER_API_KEY"),
    },
    {
      provider: "anthropic",
      model: "claude-sonnet-5",
      costPerMTokensUsd: 3,
      typicalLatencyMs: 3500,
      available: hasEnv("ANTHROPIC_API_KEY"),
    },
    {
      provider: "openai",
      // Réservé aux embeddings (directive opérateur 2026-06-24) — jamais dans
      // les candidats texte, cf. `buildTextProviderCandidates`.
      model: "text-embedding-3-small",
      costPerMTokensUsd: 0.02,
      typicalLatencyMs: 400,
      available: hasEnv("OPENAI_API_KEY"),
    },
  ];
}

/** Modèles réellement configurés sur ce déploiement (page /status). */
export function listAvailableModels(): readonly ModelChoice[] {
  return catalog().filter((m) => m.available);
}
