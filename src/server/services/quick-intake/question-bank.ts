import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_MODELS, ECONOMIC_MODELS, POSITIONING_ARCHETYPES } from "@/lib/types/business-context";

export interface IntakeQuestion {
  id: string;
  pillar: string;
  question: string;
  type: "text" | "select" | "multiselect" | "scale";
  options?: string[];
  required: boolean;
}

const getClient = () => new Anthropic();

const PILLAR_NAMES: Record<string, string> = {
  a: "Authenticite",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
  r: "Resilience",
  t: "Tracking",
  i: "Investissement",
  s: "Strategie",
};

const QUESTION_BANK: Record<string, IntakeQuestion[]> = {
  // ========================================================================
  // Business context questions — captured before ADVE pillars
  // ========================================================================
  biz: [
    {
      id: "biz_model", pillar: "biz",
      question: "Quel est votre modele d'affaires principal ?",
      type: "select",
      options: Object.entries(BUSINESS_MODELS).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_revenue", pillar: "biz",
      question: "Comment generez-vous principalement vos revenus ? (plusieurs choix possibles)",
      type: "multiselect",
      options: Object.entries(ECONOMIC_MODELS).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_positioning", pillar: "biz",
      question: "Comment positionnez-vous vos prix par rapport au marche ?",
      type: "select",
      options: Object.entries(POSITIONING_ARCHETYPES).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_sales_channel", pillar: "biz",
      question: "Comment vendez-vous ?",
      type: "select",
      options: [
        "DIRECT::Directement au client final (D2C)",
        "INTERMEDIATED::Via des distributeurs / revendeurs",
        "HYBRID::Les deux (vente directe + distributeurs)",
      ],
      required: true,
    },
    {
      id: "biz_free_element", pillar: "biz",
      question: "Y a-t-il une partie gratuite dans votre offre ?",
      type: "select",
      options: [
        "NONE::Non, tout est payant",
        "FREEMIUM::Oui, une version gratuite limitee",
        "CONTENT::Oui, du contenu ou des outils gratuits",
        "AD_SUPPORTED::Oui, un modele finance par la publicite",
      ],
      required: false,
    },
    {
      id: "biz_free_detail", pillar: "biz",
      question: "Si oui, decrivez ce qui est gratuit vs. ce qui est payant.",
      type: "text",
      required: false,
    },
    {
      id: "biz_premium_scope", pillar: "biz",
      question: "Votre positionnement premium/luxe concerne-t-il toute votre gamme ou seulement certains produits ?",
      type: "select",
      options: [
        "FULL::Toute la marque est positionnee premium/luxe",
        "PARTIAL::Seulement certains produits ou lignes",
        "NONE::Nous ne sommes pas positionnes premium/luxe",
      ],
      required: false,
    },
  ],

  // ========================================================================
  // ADVE Pillar questions
  // ========================================================================
  a: [
    { id: "a_vision", pillar: "a", question: "Quelle est la vision de votre marque ? Ou voulez-vous etre dans 10 ans ?", type: "text", required: true },
    { id: "a_mission", pillar: "a", question: "Quelle est votre mission ? Pourquoi votre marque existe-t-elle ?", type: "text", required: true },
    { id: "a_origin", pillar: "a", question: "Racontez l'histoire de la creation de votre marque.", type: "text", required: false },
    { id: "a_values", pillar: "a", question: "Quelles sont les 3-5 valeurs fondamentales de votre marque ?", type: "text", required: true },
    { id: "a_archetype", pillar: "a", question: "Si votre marque etait une personne, comment la decririez-vous ?", type: "text", required: false },
  ],
  d: [
    { id: "d_positioning", pillar: "d", question: "Qu'est-ce qui vous rend unique par rapport a vos concurrents ?", type: "text", required: true },
    { id: "d_visual", pillar: "d", question: "Comment decririez-vous votre identite visuelle ?", type: "select", options: ["Inexistante", "Basique", "Definie mais incoherente", "Professionnelle et coherente", "Distinctive et memorable"], required: true },
    { id: "d_voice", pillar: "d", question: "Quel ton utilisez-vous pour communiquer ?", type: "select", options: ["Pas defini", "Formel", "Decontracte", "Inspirant", "Provocateur", "Expert"], required: true },
    { id: "d_competitors", pillar: "d", question: "Nommez vos 3 principaux concurrents.", type: "text", required: false },
  ],
  v: [
    { id: "v_promise", pillar: "v", question: "Quelle promesse faites-vous a vos clients ?", type: "text", required: true },
    { id: "v_products", pillar: "v", question: "Quels sont vos produits/services principaux ?", type: "text", required: true },
    { id: "v_experience", pillar: "v", question: "Comment evaluez-vous l'experience client que vous offrez ?", type: "scale", required: true },
  ],
  e: [
    { id: "e_community", pillar: "e", question: "Avez-vous une communaute autour de votre marque ?", type: "select", options: ["Aucune", "Reseaux sociaux basiques", "Communaute active", "Communaute engagee et fidele"], required: true },
    { id: "e_loyalty", pillar: "e", question: "Quel % de vos clients reviennent regulierement ?", type: "select", options: ["< 10%", "10-30%", "30-50%", "50-70%", "> 70%"], required: true },
    { id: "e_advocates", pillar: "e", question: "Vos clients recommandent-ils activement votre marque ?", type: "select", options: ["Jamais", "Rarement", "Parfois", "Souvent", "Systematiquement"], required: true },
    { id: "e_rituals", pillar: "e", question: "Avez-vous des rituels ou traditions de marque ?", type: "text", required: false },
  ],
  r: [
    { id: "r_threats", pillar: "r", question: "Quels sont les 3 plus grands risques pour votre marque ?", type: "text", required: true },
    { id: "r_crisis", pillar: "r", question: "Avez-vous un plan de gestion de crise ?", type: "select", options: ["Non", "En cours de creation", "Basique", "Complet et teste"], required: true },
    { id: "r_reputation", pillar: "r", question: "Comment surveillez-vous votre reputation en ligne ?", type: "select", options: ["Pas du tout", "Manuellement parfois", "Outils basiques", "Monitoring avance"], required: true },
  ],
  t: [
    { id: "t_kpis", pillar: "t", question: "Quels KPIs suivez-vous pour votre marque ?", type: "text", required: true },
    { id: "t_measurement", pillar: "t", question: "A quelle frequence mesurez-vous la performance de votre marque ?", type: "select", options: ["Jamais", "Annuellement", "Trimestriellement", "Mensuellement", "En continu"], required: true },
    { id: "t_nps", pillar: "t", question: "Connaissez-vous votre Net Promoter Score (NPS) ?", type: "select", options: ["Non", "Approximativement", "Oui, mesure regulierement"], required: false },
  ],
  i: [
    { id: "i_roadmap", pillar: "i", question: "Avez-vous un plan marketing structure ?", type: "select", options: ["Non", "Informel", "Plan annuel", "Plan 3 ans"], required: true },
    { id: "i_budget", pillar: "i", question: "Quel % de votre CA investissez-vous en marketing/branding ?", type: "select", options: ["< 2%", "2-5%", "5-10%", "10-15%", "> 15%"], required: true },
    { id: "i_team", pillar: "i", question: "Qui gere votre marque au quotidien ?", type: "select", options: ["Personne de dedie", "Le fondateur/DG", "Un responsable marketing", "Une equipe dediee"], required: true },
  ],
  s: [
    { id: "s_guidelines", pillar: "s", question: "Avez-vous des guidelines de marque documentees ?", type: "select", options: ["Non", "Basiques (logo, couleurs)", "Completes (voix, ton, visuels)", "Bible de marque exhaustive"], required: true },
    { id: "s_coherence", pillar: "s", question: "Sur une echelle de 1-10, a quel point votre communication est-elle coherente sur tous les canaux ?", type: "scale", required: true },
    { id: "s_ambition", pillar: "s", question: "Ou voulez-vous que votre marque soit dans 3 ans ?", type: "text", required: true },
  ],
};

export function getBusinessContextQuestions(): IntakeQuestion[] {
  return QUESTION_BANK.biz ?? [];
}

export async function getAdaptiveQuestions(
  pillar: string,
  existingResponses: Record<string, unknown>,
  businessContext?: { sector?: string; positioning?: string }
): Promise<IntakeQuestion[]> {
  const questions = QUESTION_BANK[pillar];
  if (!questions) return [];

  // Try to generate AI follow-up questions
  try {
    const aiQuestions = await generateAiFollowUps(
      pillar,
      existingResponses,
      businessContext
    );
    return [...questions, ...aiQuestions];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[AI fallback] question-bank:", reason);
    return questions;
  }
}

/**
 * Ask Claude to generate 1-2 targeted follow-up questions in French
 * based on the user's existing responses and business context.
 * Wrapped with an 8-second timeout.
 */
async function generateAiFollowUps(
  pillar: string,
  existingResponses: Record<string, unknown>,
  businessContext?: { sector?: string; positioning?: string }
): Promise<IntakeQuestion[]> {
  const client = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const pillarName = PILLAR_NAMES[pillar] ?? pillar;
    const responseSummary = Object.entries(existingResponses)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");

    const contextInfo = businessContext
      ? `Secteur d'activite: ${businessContext.sector ?? "non specifie"}\nPositionnement: ${businessContext.positioning ?? "non specifie"}`
      : "Contexte business non disponible.";

    const response = await client.messages.create(
      {
        model: "claude-3-5-haiku-20241022",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `Tu es un expert en strategie de marque utilisant le framework ADVE.
On evalue actuellement le pilier "${pillarName}" (cle: "${pillar}").

Contexte business:
${contextInfo}

Reponses existantes de l'utilisateur:
${responseSummary || "Aucune reponse encore."}

Genere exactement 1 ou 2 questions de suivi en francais qui creusent plus profondement les faiblesses ou lacunes detectees dans les reponses. Les questions doivent etre pertinentes au pilier "${pillarName}".

Reponds UNIQUEMENT avec un tableau JSON valide, sans texte autour. Chaque element doit avoir:
- "id": string (format: "${pillar}_ai_1" ou "${pillar}_ai_2")
- "question": string (la question en francais)
- "type": "text" (toujours text pour les questions AI)
- "pillar": "${pillar}"
- "required": false

Exemple de format:
[{"id":"${pillar}_ai_1","question":"Pourriez-vous preciser...","type":"text","pillar":"${pillar}","required":false}]`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const text =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    // Extract JSON array from the response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`No JSON array found in AI response: "${text.slice(0, 100)}"`);
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      throw new Error("AI response is not an array");
    }

    // Validate and sanitize each question
    const validated: IntakeQuestion[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).question === "string" &&
        typeof (item as Record<string, unknown>).pillar === "string"
      ) {
        validated.push({
          id: String((item as Record<string, unknown>).id),
          question: String((item as Record<string, unknown>).question),
          type: "text",
          pillar,
          required: false,
        });
      }
    }

    return validated.slice(0, 2); // Never more than 2 AI questions
  } finally {
    clearTimeout(timeout);
  }
}

export function getAllQuestions(): Record<string, IntakeQuestion[]> {
  return QUESTION_BANK;
}
