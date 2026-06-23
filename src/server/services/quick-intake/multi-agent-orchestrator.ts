import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";
import { SHAPE_PER_PILLAR } from "./pillar-shapes";

interface AgentWorkerConfig {
  role: string;
  focus: string;
}

const WORKERS: Record<string, AgentWorkerConfig> = {
  acq_act: {
    role: "Spécialiste Growth & Haut de Tunnel (Acquisition / Activation)",
    focus: "Concentre-toi sur les actions marketing qui génèrent de la visibilité massive, de l'acquisition de trafic et la conversion initiale (Activation).",
  },
  ret_rev: {
    role: "Spécialiste Rétention, Revenu & Référence (Bas de Tunnel)",
    focus: "Concentre-toi sur les actions de fidélisation, d'upsell, de LTV (Life Time Value) et de viralité/bouches-à-oreilles (Referral).",
  },
  culture: {
    role: "Spécialiste Culture, Fenêtre d'Overton & Équité de Marque",
    focus: "Concentre-toi sur les actions 'PR', les coups d'éclat culturels, l'impact sur la pyramide de Maslow (Client & Marque) et le déplacement de la fenêtre d'Overton.",
  },
};

const ACTION_SHAPE = `{
  "title": "...",
  "description": "...",
  "aarrrPrimary": "Acquisition|Activation|Retention|Revenue|Referral",
  "aarrrSecondary": "Acquisition|Activation|Retention|Revenue|Referral",
  "overtonRole": "...",
  "maslowClient": "...",
  "maslowBrand": "...",
  "costEstimation": "Low|Medium|High",
  "assetsInvolved": ["..."],
  "idealTiming": "...",
  "kpi": "..."
}`;

export async function generatePillarIMultiAgent(
  companyName: string,
  contextBlock: string
): Promise<Record<string, unknown>> {
  // 1. Lancement des 3 workers en parallèle
  const workerPromises = Object.entries(WORKERS).map(async ([id, config]) => {
    // LOT 1e — entrées non fiables neutralisées (anti-injection). companyName +
    // contextBlock (ADVE founder + refs marché Seshat + comparables) viennent du
    // dirigeant/sources externes : nom inline, contexte en bloc « donnée ».
    const prompt = `MARQUE : ${sanitizeInline(companyName, { max: 120 })}

${wrapUntrusted("CONTEXTE ADVE & MARCHÉ", contextBlock, { max: 12000 })}

Tu es ${config.role}.
${config.focus}

Propose EXACTEMENT 4 actions marketing ultra-spécifiques pour cette marque.
Chaque action doit suivre ce JSON :
${ACTION_SHAPE}

Réponds UNIQUEMENT avec un objet JSON contenant le tableau "actions".
{
  "actions": [ ... ]
}`;

    try {
      const { text } = await callLLM({
        caller: `quick-intake:multi-agent:worker-${id}`,
        purpose: "agent",
        system: `${UNTRUSTED_NOTICE}\n\nTu es un agent expert marketing spécialisé. Tu réponds strictement en JSON.`,
        prompt,
        maxOutputTokens: 2500,
      });
      const parsed = extractJSON(text) as { actions?: unknown[] };
      return parsed.actions ?? [];
    } catch (e) {
      console.warn(`[multi-agent] Worker ${id} failed:`, e);
      return []; // Fallback gracefully if one worker fails
    }
  });

  const workerResults = await Promise.all(workerPromises);
  const allActions = workerResults.flat();

  // 2. Superviseur pour synthétiser et dédupliquer
  // LOT 1e — entrées non fiables neutralisées (anti-injection). companyName inline ;
  // allActions est une sortie LLM dérivée du contexte founder/marché non fiable
  // (peut contenir une injection ré-émise) → on la balise comme bloc « donnée ».
  const supervisorPrompt = `MARQUE : ${sanitizeInline(companyName, { max: 120 })}

Voici ${allActions.length} propositions d'actions marketing générées par tes sous-agents (Acquisition, Rétention, Culture).

${wrapUntrusted("ACTIONS PROPOSÉES", JSON.stringify(allActions, null, 2), { max: 16000 })}

Mission du Superviseur :
1. Examine ces actions. Supprime les doublons ou celles qui se ressemblent trop.
2. Garde les 8 à 12 meilleures actions (les plus impactantes et réalistes).
3. Rédige également une "narrative" de 2-3 phrases qui synthétise le potentiel d'innovation global.

Tu dois produire le Pilier I complet au format JSON exact suivant :
${SHAPE_PER_PILLAR["i"]}
`;

  const { text } = await callLLM({
    caller: "quick-intake:multi-agent:supervisor",
    purpose: "agent",
    system: `${UNTRUSTED_NOTICE}\n\nTu es l'Agent Superviseur (Directeur Stratégie). Tu harmonises le travail de tes sous-agents. Tu réponds strictement en JSON.`,
    prompt: supervisorPrompt,
    maxOutputTokens: 4000,
  });

  const finalPillar = extractJSON(text);
  if (!finalPillar || typeof finalPillar !== "object") {
    throw new Error("multi-agent supervisor: shape JSON invalide");
  }

  return finalPillar as Record<string, unknown>;
}
