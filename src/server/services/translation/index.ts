import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranslationRequest {
  driverId: string;
  sourceMarket: string;
  targetMarket: string;
  content: Record<string, unknown>;
}

export interface TranslationResult {
  driverId: string;
  sourceMarket: string;
  targetMarket: string;
  translatedContent: Record<string, unknown>;
  culturalAdaptations: string[];
  confidence: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  markets: string[];
}

export interface ContentTranslationResult {
  translatedContent: Record<string, unknown>;
  targetLanguage: string;
  culturalAdaptations: string[];
  confidence: number;
}

export interface BriefTranslationResult {
  briefId: string;
  targetLanguage: string;
  translatedTitle: string;
  translatedContent: Record<string, unknown>;
  culturalAdaptations: string[];
  confidence: number;
  translatedAt: string;
}

// ---------------------------------------------------------------------------
// Supported languages
// ---------------------------------------------------------------------------

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "FR", name: "French", nativeName: "Francais", markets: ["CM", "CI", "SN", "GA", "CG", "CD", "BF", "ML", "BJ", "TG"] },
  { code: "EN", name: "English", nativeName: "English", markets: ["CM", "GH", "NG", "KE", "ZA"] },
  { code: "ES", name: "Spanish", nativeName: "Espanol", markets: ["GQ"] },
  { code: "DE", name: "German", nativeName: "Deutsch", markets: ["CM"] },
  { code: "PT", name: "Portuguese", nativeName: "Portugues", markets: ["MZ", "AO", "CV", "ST"] },
  { code: "AR", name: "Arabic", nativeName: "العربية", markets: ["TD", "MA", "TN", "DZ"] },
];

// ---------------------------------------------------------------------------
// v4 — Cultural Registers (sociolinguistic variants)
// ---------------------------------------------------------------------------

export interface CulturalRegister {
  id: string;
  name: string;
  description: string;
  markets: string[];
  baseLanguage: string;
  toneGuidelines: string;
  termMappings: Record<string, string>; // standard FR → register variant
}

const CULTURAL_REGISTERS: CulturalRegister[] = [
  {
    id: "formal_fr",
    name: "Francais standard (business)",
    description: "Francais soutenu pour communication corporate, presse, institutionnel.",
    markets: ["CM", "CI", "SN", "GA", "CG", "CD", "BF", "ML", "BJ", "TG"],
    baseLanguage: "FR",
    toneGuidelines: "Ton professionnel, vouvoiement systematique, pas d'argot. Registre soutenu adapte aux marques premium et institutionnelles.",
    termMappings: {
      "marque": "marque",
      "consommateur": "consommateur",
      "campagne": "campagne",
      "engagement": "engagement",
      "offre": "proposition de valeur",
    },
  },
  {
    id: "nouchi_ci",
    name: "Nouchi (Abidjan)",
    description: "Registre urbain ivoirien, melange francais-dioula-baoule, authentique pour la jeunesse d'Abidjan.",
    markets: ["CI"],
    baseLanguage: "FR",
    toneGuidelines: "Tutoiement accepte. Expressions locales encouragees: 'c'est garanti', 'on est la', 'c'est chaud'. Rythme rapide, phrases courtes. Integrer des references culturelles ivoiriennes (zouglou, coupe decale, garba, allocodrome). Eviter le francais trop academique.",
    termMappings: {
      "marque": "le brand",
      "consommateur": "le gars / la go",
      "campagne": "le buzz",
      "engagement": "le tchatcham",
      "offre": "le deal",
      "excellent": "c'est dja",
      "acheter": "prendre",
      "argent": "l'oseille",
      "ambiance": "l'ambiance",
      "cool": "c'est kpakpato",
    },
  },
  {
    id: "camfranglais_cm",
    name: "Camfranglais (Douala/Yaounde)",
    description: "Melange francais-anglais-pidgin camerounais, idiome de la jeunesse urbaine du Cameroun.",
    markets: ["CM"],
    baseLanguage: "FR",
    toneGuidelines: "Code-switching francais/anglais naturel. Expressions locales: 'je go', 'c'est le ndem', 'on va manage', 'c'est le handle'. References culturelles: makossa, bikutsi, ndole, Brasseries du Cameroun. Tutoiement acceptable pour les marques youth. Pidjin anglais pour authenticite.",
    termMappings: {
      "marque": "le brand",
      "consommateur": "le mbom / la mola",
      "campagne": "le move",
      "engagement": "le vibe",
      "offre": "le package",
      "excellent": "c'est le top",
      "acheter": "take",
      "argent": "le mburu",
      "probleme": "le ndem",
      "comprendre": "compris ya ?",
    },
  },
  {
    id: "wolof_sn",
    name: "Wolof-Francais (Dakar)",
    description: "Registre bilingue wolof-francais typique de Dakar et du Senegal urbain.",
    markets: ["SN"],
    baseLanguage: "FR",
    toneGuidelines: "Alterner naturellement entre francais et wolof dans la meme phrase. Expressions wolof courantes: 'nanga def' (bonjour), 'jerrejef' (merci), 'teranga' (hospitalite). References culturelles: thieboudienne, lutte senegalaise, mbalax. La teranga est une valeur centrale — toute communication doit respirer l'accueil. Vouvoiement marque le respect.",
    termMappings: {
      "bienvenue": "dalal ak jamm",
      "merci": "jerrejef",
      "bonjour": "nanga def",
      "excellent": "baax na",
      "ensemble": "bokk",
      "famille": "njaboot",
      "communaute": "mbokk",
      "fete": "sabar",
      "partager": "seddo",
    },
  },
];

export function getCulturalRegisters(): CulturalRegister[] {
  return CULTURAL_REGISTERS;
}

export function getRegisterForMarket(market: string): CulturalRegister | null {
  // Return the most specific register for the market (non-formal first)
  const specific = CULTURAL_REGISTERS.find(
    (r) => r.id !== "formal_fr" && r.markets.includes(market)
  );
  return specific ?? CULTURAL_REGISTERS.find((r) => r.markets.includes(market)) ?? null;
}

export function getRegisterById(id: string): CulturalRegister | null {
  return CULTURAL_REGISTERS.find((r) => r.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// getSupportedLanguages
// ---------------------------------------------------------------------------

export function getSupportedLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}

// ---------------------------------------------------------------------------
// getAnthropicClient — Lazily create the Anthropic client
// ---------------------------------------------------------------------------

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Translation service requires an Anthropic API key."
    );
  }
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// translateContent — Translate strategic content with cultural adaptation.
// Uses Claude AI for high-quality contextual translation.
// ---------------------------------------------------------------------------

export async function translateContent(
  content: Record<string, unknown>,
  targetLanguage: string,
  context?: {
    sector?: string;
    market?: string;
    brandVoice?: string;
    channel?: string;
  }
): Promise<ContentTranslationResult> {
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  if (!langInfo) {
    throw new Error(
      `Unsupported language: ${targetLanguage}. Supported: ${SUPPORTED_LANGUAGES.map((l) => l.code).join(", ")}`
    );
  }

  const client = getAnthropicClient();

  const systemPrompt = buildTranslationSystemPrompt(langInfo, context);
  const contentStr = JSON.stringify(content, null, 2);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Translate the following strategic content to ${langInfo.name} (${langInfo.nativeName}).

Return a JSON object with exactly two keys:
1. "translated" — the translated content preserving the same JSON structure and keys (keys stay in English, only values are translated)
2. "adaptations" — an array of strings describing cultural adaptations you made

Content to translate:
\`\`\`json
${contentStr}
\`\`\``,
      },
    ],
  });

  const textContent = response.content.find((c: { type: string }) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from translation API");
  }

  const parsed = extractJsonFromResponse(textContent.text);

  return {
    translatedContent: (parsed.translated as Record<string, unknown>) ?? content,
    targetLanguage,
    culturalAdaptations: (parsed.adaptations as string[]) ?? [],
    confidence: computeTranslationConfidence(content, parsed.translated as Record<string, unknown>),
  };
}

// ---------------------------------------------------------------------------
// translateBrief — Translate an entire brief (mission) maintaining brand voice.
// ---------------------------------------------------------------------------

export async function translateBrief(
  briefId: string,
  targetLanguage: string
): Promise<BriefTranslationResult> {
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  if (!langInfo) {
    throw new Error(
      `Unsupported language: ${targetLanguage}. Supported: ${SUPPORTED_LANGUAGES.map((l) => l.code).join(", ")}`
    );
  }

  const mission = await db.mission.findUniqueOrThrow({
    where: { id: briefId },
    include: {
      driver: true,
      strategy: {
        include: { pillars: true },
      },
    },
  });

  // Get sector from QuickIntake
  const intake = await db.quickIntake.findFirst({
    where: { convertedToId: mission.strategyId },
    select: { sector: true, country: true },
  });

  // Build the brief content to translate
  const briefContent: Record<string, unknown> = {
    title: mission.title,
    ...(mission.advertis_vector
      ? { advertis_context: mission.advertis_vector }
      : {}),
  };

  // Include driver-specific content
  if (mission.driver) {
    briefContent.channel = mission.driver.channel;
    briefContent.channelType = mission.driver.channelType;
    briefContent.formatSpecs = mission.driver.formatSpecs;
    briefContent.briefTemplate = mission.driver.briefTemplate;
  }

  // Include pillar content for context
  const pillarContent: Record<string, unknown> = {};
  for (const pillar of mission.strategy.pillars) {
    pillarContent[pillar.key] = pillar.content;
  }
  briefContent.pillarContext = pillarContent;

  const client = getAnthropicClient();

  const systemPrompt = buildTranslationSystemPrompt(langInfo, {
    sector: intake?.sector ?? undefined,
    market: intake?.country ?? undefined,
    channel: mission.driver?.channel,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Translate this complete creative brief to ${langInfo.name} (${langInfo.nativeName}).

This is a strategic creative brief for a brand. Maintain:
- Brand voice consistency
- Strategic terminology accuracy
- Cultural relevance for the ${targetLanguage}-speaking market
- All ADVE pillar references (Authenticite, Distinction, Valeur, Engagement, Risk, Track, Implementation, Strategie)

Return a JSON object with exactly three keys:
1. "translatedTitle" — the translated brief title
2. "translated" — the full translated brief content preserving JSON structure (keys in English, values translated)
3. "adaptations" — array of cultural adaptations made

Brief content:
\`\`\`json
${JSON.stringify(briefContent, null, 2)}
\`\`\``,
      },
    ],
  });

  const textContent = response.content.find((c: { type: string }) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from translation API");
  }

  const parsed = extractJsonFromResponse(textContent.text);

  return {
    briefId,
    targetLanguage,
    translatedTitle: (parsed.translatedTitle as string) ?? mission.title,
    translatedContent: (parsed.translated as Record<string, unknown>) ?? briefContent,
    culturalAdaptations: (parsed.adaptations as string[]) ?? [],
    confidence: computeTranslationConfidence(briefContent, parsed.translated as Record<string, unknown>),
    translatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// translateForMarket — Existing function: translate Driver content for market
// ---------------------------------------------------------------------------

export async function translateForMarket(
  request: TranslationRequest
): Promise<TranslationResult> {
  const driver = await db.driver.findUniqueOrThrow({
    where: { id: request.driverId },
    include: { strategy: true },
  });

  const adaptations = getCulturalAdaptations(
    request.sourceMarket,
    request.targetMarket,
    driver.channel
  );

  // Use AI translation if API key is available
  try {
    const targetLang = marketToLanguage(request.targetMarket);
    const intake = await db.quickIntake.findFirst({
      where: { convertedToId: driver.strategyId },
      select: { sector: true },
    });

    const result = await translateContent(request.content, targetLang, {
      sector: intake?.sector ?? undefined,
      market: request.targetMarket,
      channel: driver.channel,
    });

    return {
      driverId: request.driverId,
      sourceMarket: request.sourceMarket,
      targetMarket: request.targetMarket,
      translatedContent: result.translatedContent,
      culturalAdaptations: [...result.culturalAdaptations, ...adaptations],
      confidence: result.confidence,
    };
  } catch {
    // Fallback to rule-based adaptation if AI is unavailable
    return {
      driverId: request.driverId,
      sourceMarket: request.sourceMarket,
      targetMarket: request.targetMarket,
      translatedContent: {
        ...request.content,
        _targetMarket: request.targetMarket,
        _adaptationNotes: adaptations,
      },
      culturalAdaptations: adaptations,
      confidence: 0.5,
    };
  }
}

// ---------------------------------------------------------------------------
// getAvailableMarkets
// ---------------------------------------------------------------------------

export async function getAvailableMarkets(driverId: string): Promise<string[]> {
  const driver = await db.driver.findUniqueOrThrow({
    where: { id: driverId },
  });
  const meta = driver.constraints as Record<string, unknown> | null;
  const currentMarket = (meta?.market as string) ?? "CM";

  const allMarkets = [
    "CM",
    "CI",
    "SN",
    "GA",
    "CG",
    "CD",
    "BF",
    "ML",
    "BJ",
    "TG",
  ];
  return allMarkets.filter((m) => m !== currentMarket);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildTranslationSystemPrompt(
  langInfo: SupportedLanguage,
  context?: {
    sector?: string;
    market?: string;
    brandVoice?: string;
    channel?: string;
  }
): string {
  let prompt = `You are an expert translator specializing in brand strategy and advertising content for African markets. You translate to ${langInfo.name} (${langInfo.nativeName}).

Key rules:
- Preserve JSON structure: translate values only, keep keys in English
- Maintain brand terminology and strategic vocabulary accuracy
- ADVE framework terms should stay in French (Authenticite, Distinction, Valeur, Engagement, Risk, Track, Implementation, Strategie) unless the target language is not French
- Adapt cultural references, idioms, and examples to the target market
- Preserve numerical values and scores unchanged
- Flag any content that requires local market expertise for proper adaptation
- Return valid JSON only — no markdown fences, no explanation outside the JSON`;

  if (context?.sector) {
    prompt += `\n- Sector context: ${context.sector}. Use industry-appropriate terminology.`;
  }
  if (context?.market) {
    prompt += `\n- Target market: ${context.market}. Adapt cultural references to this market.`;
  }
  if (context?.brandVoice) {
    prompt += `\n- Brand voice: ${context.brandVoice}. Maintain this tone throughout.`;
  }
  if (context?.channel) {
    prompt += `\n- Distribution channel: ${context.channel}. Adapt format and length accordingly.`;
  }

  return prompt;
}

function extractJsonFromResponse(text: string): Record<string, unknown> {
  // Try to parse the response as JSON directly
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // Try to extract JSON from markdown code fences
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1]) as Record<string, unknown>;
      } catch {
        // Fall through
      }
    }

    // Try to find a JSON object in the text
    const braceStart = text.indexOf("{");
    const braceEnd = text.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      try {
        return JSON.parse(text.slice(braceStart, braceEnd + 1)) as Record<
          string,
          unknown
        >;
      } catch {
        // Fall through
      }
    }

    return { translated: null, adaptations: ["Translation parsing failed — manual review required"] };
  }
}

function computeTranslationConfidence(
  original: Record<string, unknown>,
  translated: Record<string, unknown> | null
): number {
  if (!translated) return 0;

  const originalKeys = Object.keys(original);
  const translatedKeys = Object.keys(translated);

  // Check key preservation
  const preservedKeys = originalKeys.filter((k) => translatedKeys.includes(k));
  const keyPreservation =
    originalKeys.length > 0 ? preservedKeys.length / originalKeys.length : 0;

  // Check that values were actually changed (not just copied)
  let changedValues = 0;
  for (const key of preservedKeys) {
    if (JSON.stringify(original[key]) !== JSON.stringify(translated[key])) {
      changedValues++;
    }
  }
  const changeRatio =
    preservedKeys.length > 0 ? changedValues / preservedKeys.length : 0;

  // Confidence = weighted average of key preservation and change ratio
  return Math.round((keyPreservation * 0.6 + changeRatio * 0.4) * 100) / 100;
}

function marketToLanguage(market: string): string {
  const marketLangMap: Record<string, string> = {
    CM: "FR",
    CI: "FR",
    SN: "FR",
    GA: "FR",
    CG: "FR",
    CD: "FR",
    BF: "FR",
    ML: "FR",
    BJ: "FR",
    TG: "FR",
    GH: "EN",
    NG: "EN",
    KE: "EN",
    ZA: "EN",
    GQ: "ES",
    MZ: "PT",
    AO: "PT",
    TD: "AR",
    MA: "AR",
  };
  return marketLangMap[market] ?? "FR";
}

function getCulturalAdaptations(
  source: string,
  target: string,
  channel: string
): string[] {
  const adaptations: string[] = [];

  if (source === "CM" && target === "CI") {
    adaptations.push(
      "Adapter le vocabulaire: 'garba' -> 'attieke', contexte culinaire local"
    );
    adaptations.push(
      "References sportives: remplacer Lions Indomptables par Elephants"
    );
  }
  if (source === "CM" && target === "SN") {
    adaptations.push(
      "Adapter le ton: le marche senegalais prefere un ton plus sobre"
    );
    adaptations.push(
      "Wolof expressions may be needed for social channels"
    );
  }

  if (channel === "INSTAGRAM" || channel === "TIKTOK") {
    adaptations.push(
      "Adapter les hashtags populaires au marche cible"
    );
    adaptations.push(
      "Verifier les heures de pic d'engagement dans le fuseau horaire cible"
    );
  }
  if (channel === "PR") {
    adaptations.push(
      "Identifier les medias locaux pertinents dans le marche cible"
    );
    adaptations.push(
      "Adapter le format du communique aux conventions locales"
    );
  }
  if (channel === "EVENT") {
    adaptations.push(
      "Verifier les jours feries et dates culturelles du marche cible"
    );
  }

  if (adaptations.length === 0) {
    adaptations.push("Adaptation linguistique standard");
    adaptations.push(
      "Verifier la pertinence des visuels pour le marche cible"
    );
  }

  return adaptations;
}
