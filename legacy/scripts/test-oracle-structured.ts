/**
 * Test harness — Oracle structured-LLM path against live Ollama.
 *
 * Exerce `executeStructuredLLMCall` (le chemin emprunté par TOUTES les sections
 * LLM de l'Oracle via executeFramework / executeTool) avec un schéma de type
 * framework (analysis/score/prescriptions/confidence) + un contexte réaliste +
 * 4096 tokens de sortie. Vérifie : routage vers OLLAMA_STRUCTURED_MODEL
 * (hermes3-fast), validation Zod OK, vitesse. Read-only, aucune écriture DB.
 *
 *   node --env-file-if-exists=.env.local --import tsx scripts/test-oracle-structured.ts
 */

import { z } from "zod";
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";

const FrameworkSchema = z.object({
  analysis: z.string().min(40),
  score: z.number().min(0).max(10),
  prescriptions: z.array(z.string().min(5)).min(2),
  confidence: z.number().min(0).max(1),
});

// Contexte ~framework (volumineux exprès — ce qui ferait truncate un modèle 4K).
const strategyContext = [
  "[MARQUE] La Fusée — plateforme SaaS de stratégie de marque (framework ADVE-RTIS).",
  "[A/Authenticité] Archétype: le Sage-Créateur. Mission: rendre la stratégie de marque",
  "  accessible et exécutable. Vision: chaque marque pilotée comme un mouvement.",
  "[D/Distinction] Positionnement: l'Oracle stratégique opérationnel, pas un simple outil.",
  "[V/Valeur] Offre: diagnostic ADVE-RTIS + génération d'actifs + roadmap. Pricing par tiers.",
  "[E/Engagement] Communauté de créateurs (La Guilde), rituels d'onboarding, gamification.",
  "[R/Risk] Risques: dépendance LLM cloud, complexité perçue, adoption B2B lente.",
  "[T/Track] Marché EdTech/MarTech Afrique francophone + international. TAM en croissance.",
  "[I/Potentiel] Catalogue d'actions multi-canal (digital, événementiel, PR, production).",
  "[S/Stratégie] Fenêtre d'Overton: outil technique → copilote stratégique indispensable.",
].join("\n");

async function main() {
  console.log("\n=== Test Oracle structured-LLM (executeStructuredLLMCall) ===");
  console.log(`OLLAMA_STRUCTURED_MODEL = ${process.env.OLLAMA_STRUCTURED_MODEL ?? "(non défini → ModelPolicy)"}\n`);

  const t0 = Date.now();
  try {
    const res = await executeStructuredLLMCall({
      system: `Tu es ARTEMIS, moteur de diagnostic stratégique ADVE-RTIS.\n\n${strategyContext}`,
      prompt: "Analyse la cohérence stratégique globale de cette marque et produis un diagnostic structuré (score /10, prescriptions concrètes, niveau de confiance).",
      schema: FrameworkSchema,
      caller: "test:oracle-structured",
      maxOutputTokens: 4096,
      schemaTitle: "DiagnosticCoherence",
      validationMode: "strict",
    });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);

    console.log("--- Résultat (validé Zod) ---");
    console.log(`  attempts     : ${res.attempts}`);
    console.log(`  score        : ${res.data.score}/10`);
    console.log(`  confidence   : ${res.data.confidence}`);
    console.log(`  prescriptions: ${res.data.prescriptions.length}`);
    console.log(`  analysis     : ${res.data.analysis.slice(0, 120)}…`);
    console.log(`  durée        : ${dur}s`);
    console.log(`\n✅ PASS — l'appel structuré Oracle valide le schéma, sur le modèle rapide.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ FAIL — executeStructuredLLMCall a échoué:", err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main().catch((e) => { console.error("ERREUR:", e); process.exit(1); });
