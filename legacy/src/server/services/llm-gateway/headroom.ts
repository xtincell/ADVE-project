/**
 * LLM Gateway — Headroom in-process (Vague 8 mégasprint, mandat
 * « Implémente Headroom pour optimiser » — github.com/chopratejas/headroom).
 *
 * Compression de contexte AVANT l'appel provider : transforms locaux,
 * déterministes et réversibles (SmartCrusher sur les gros blobs JSON/logs,
 * dédoublonnage) — « same answers, fraction of the tokens ». Deux modes :
 *
 *   1. PROXY (`HEADROOM_PROXY_URL`) — déjà câblé dans index.ts : baseURL
 *      custom vers un proxy Headroom. Pertinent self-hosted, pas sur Vercel
 *      serverless.
 *   2. LIBRAIRIE (ce module) — `compress()` in-process sur le prompt avant
 *      `generateText`. Activé par défaut au-dessus d'un seuil de taille ;
 *      coupe-circuit `HEADROOM_DISABLED=1`. Pass-through intégral si la
 *      compression n'apporte rien ou échoue (le gateway ne dépend JAMAIS
 *      de Headroom pour fonctionner).
 *
 * Les économies sont agrégées en mémoire et exposées via
 * `getHeadroomSavings()` (surface console/monitoring).
 */

export interface HeadroomOutcome {
  prompt: string;
  system: string;
  tokensSaved: number;
  compressionRatio: number;
  applied: boolean;
}

// Seuil d'activation : en dessous, la compression ne vaut pas son CPU.
const MIN_CHARS_TO_COMPRESS = 8_000;

// ── Agrégat process-local des économies (observabilité Q2) ────────────
const savings = {
  callsCompressed: 0,
  callsSkipped: 0,
  tokensSavedTotal: 0,
};

export function getHeadroomSavings(): Readonly<typeof savings> {
  return { ...savings };
}

function isDisabled(): boolean {
  return process.env.HEADROOM_DISABLED === "1" || process.env.NODE_ENV === "test";
}

/**
 * Compresse (system, prompt) via la librairie headroom-ai. Sans effet si :
 * désactivé, sous le seuil, échec interne, ou gain nul — dans tous ces cas
 * les textes d'origine sont retournés tels quels.
 */
export async function applyHeadroom(
  system: string,
  prompt: string,
  model: string,
): Promise<HeadroomOutcome> {
  const passthrough: HeadroomOutcome = {
    prompt,
    system,
    tokensSaved: 0,
    compressionRatio: 1,
    applied: false,
  };

  if (isDisabled() || system.length + prompt.length < MIN_CHARS_TO_COMPRESS) {
    savings.callsSkipped += 1;
    return passthrough;
  }

  try {
    const { compress } = await import("headroom-ai");
    // Le gateway parle en (system, prompt) ; Headroom parle en messages.
    // Le system est porté en role system, le prompt en user — les transforms
    // (crush des gros JSON, dédup) s'appliquent au contenu user.
    const result = await compress(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { model },
    );

    const out = Array.isArray(result?.messages) ? result.messages : null;
    const tokensSaved = typeof result?.tokensSaved === "number" ? result.tokensSaved : 0;
    if (!out || tokensSaved <= 0) {
      savings.callsSkipped += 1;
      return passthrough;
    }

    const sysOut = out.find((m: { role?: string }) => m.role === "system");
    const userParts = out.filter((m: { role?: string }) => m.role !== "system");
    const contentToText = (c: unknown): string =>
      typeof c === "string"
        ? c
        : Array.isArray(c)
          ? c.map((p) => (typeof p === "string" ? p : (p as { text?: string })?.text ?? "")).join("\n")
          : "";

    const newSystem = contentToText(sysOut?.content) || system;
    const newPrompt = userParts.map((m: { content?: unknown }) => contentToText(m.content)).join("\n\n") || prompt;

    savings.callsCompressed += 1;
    savings.tokensSavedTotal += tokensSaved;

    return {
      system: newSystem,
      prompt: newPrompt,
      tokensSaved,
      compressionRatio: typeof result?.compressionRatio === "number" ? result.compressionRatio : 1,
      applied: true,
    };
  } catch (err) {
    // Jamais bloquant — Headroom est un optimiseur, pas une dépendance.
    savings.callsSkipped += 1;
    if (process.env.NODE_ENV !== "test") {
      console.warn("[llm-gateway/headroom] compression skipped:", err instanceof Error ? err.message : err);
    }
    return passthrough;
  }
}
