/**
 * One-shot patcher : ajoute `forgeOutput` aux 16 Glory tools candidats
 * identifiés par `audit-glory-forgeoutput.ts`.
 *
 * Chaque tool reçoit un `forgeOutput` adapté à son layer + nature,
 * selon la table `PATCHES` ci-dessous. Aucun tool brief-only n'est
 * touché. Le script est idempotent : skip les tools qui déclarent
 * déjà un forgeOutput.
 *
 * Run : `npx tsx scripts/patch-glory-forgeoutput.ts`
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface Patch {
  slug: string;
  forgeKind: string;
  providerHint: string;
  modelHint: string;
  manipulationProfile: string[];
  briefTextPath: string;
  defaultPillarSource: string;
}

const PATCHES: Patch[] = [
  // CR layer — print + storyboard + voice-over
  { slug: "print-ad-architect", forgeKind: "image", providerHint: "magnific", modelHint: "mystic", manipulationProfile: ["entertainer", "facilitator"], briefTextPath: "headline", defaultPillarSource: "V" },
  { slug: "storyboard-generator", forgeKind: "image", providerHint: "magnific", modelHint: "mystic", manipulationProfile: ["entertainer", "facilitator"], briefTextPath: "frames[0].description", defaultPillarSource: "V" },
  { slug: "voiceover-brief-generator", forgeKind: "audio", providerHint: "magnific", modelHint: "tts-premium", manipulationProfile: ["entertainer", "facilitator"], briefTextPath: "script", defaultPillarSource: "V" },
  // DC layer — presentations + KV
  { slug: "client-presentation-strategist", forgeKind: "design", providerHint: "figma", modelHint: "deck", manipulationProfile: ["dealer", "facilitator"], briefTextPath: "outline", defaultPillarSource: "I" },
  { slug: "creative-direction-memo", forgeKind: "design", providerHint: "figma", modelHint: "deck", manipulationProfile: ["dealer", "facilitator"], briefTextPath: "memo", defaultPillarSource: "I" },
  { slug: "pitch-architect", forgeKind: "design", providerHint: "figma", modelHint: "deck", manipulationProfile: ["dealer", "facilitator"], briefTextPath: "pitch", defaultPillarSource: "I" },
  { slug: "award-case-builder", forgeKind: "design", providerHint: "canva", modelHint: "case-study", manipulationProfile: ["entertainer", "facilitator"], briefTextPath: "narrative", defaultPillarSource: "R" },
  { slug: "sales-deck-builder", forgeKind: "design", providerHint: "canva", modelHint: "deck", manipulationProfile: ["dealer", "facilitator"], briefTextPath: "deck", defaultPillarSource: "I" },
  { slug: "kv-art-direction-brief", forgeKind: "image", providerHint: "magnific", modelHint: "mystic", manipulationProfile: ["entertainer", "facilitator"], briefTextPath: "art_direction", defaultPillarSource: "V" },
  { slug: "kv-review-validator", forgeKind: "classify", providerHint: "magnific", modelHint: "ai-classifier", manipulationProfile: ["facilitator"], briefTextPath: "kv_url", defaultPillarSource: "D" },
  { slug: "credentials-deck-builder", forgeKind: "design", providerHint: "canva", modelHint: "deck", manipulationProfile: ["dealer", "facilitator"], briefTextPath: "deck", defaultPillarSource: "I" },
  // HYBRID layer — vendor + devis (template-based)
  { slug: "vendor-brief-generator", forgeKind: "design", providerHint: "canva", modelHint: "document", manipulationProfile: ["facilitator"], briefTextPath: "brief", defaultPillarSource: "I" },
  { slug: "devis-generator", forgeKind: "design", providerHint: "canva", modelHint: "document", manipulationProfile: ["facilitator"], briefTextPath: "devis", defaultPillarSource: "T" },
  // BRAND layer — visual identity assets
  { slug: "visual-landscape-mapper", forgeKind: "image", providerHint: "magnific", modelHint: "mystic", manipulationProfile: ["facilitator"], briefTextPath: "moodboard_brief", defaultPillarSource: "D" },
  { slug: "visual-moodboard-generator", forgeKind: "image", providerHint: "magnific", modelHint: "mystic", manipulationProfile: ["facilitator", "entertainer"], briefTextPath: "moodboard_brief", defaultPillarSource: "D" },
  { slug: "iconography-system-builder", forgeKind: "icon", providerHint: "magnific", modelHint: "text-to-icon", manipulationProfile: ["facilitator"], briefTextPath: "icon_brief", defaultPillarSource: "D" },
];

function renderForgeOutput(p: Patch): string {
  const lines = [
    "    // Phase 9-suite (NEFER) — brief-to-forge auto-handoff vers Ptah",
    "    forgeOutput: {",
    `      forgeKind: ${JSON.stringify(p.forgeKind)},`,
    `      providerHint: ${JSON.stringify(p.providerHint)},`,
    `      modelHint: ${JSON.stringify(p.modelHint)},`,
    `      manipulationProfile: ${JSON.stringify(p.manipulationProfile)},`,
    `      briefTextPath: ${JSON.stringify(p.briefTextPath)},`,
    `      defaultPillarSource: ${JSON.stringify(p.defaultPillarSource)},`,
    "    },",
  ];
  return lines.join("\n");
}

function main(): void {
  const file = resolve(__dirname, "..", "src/server/services/artemis/tools/registry.ts");
  const original = readFileSync(file, "utf-8");
  const lines = original.split("\n");
  let inserted = 0;
  let skipped = 0;
  let notFound: string[] = [];

  for (const patch of PATCHES) {
    const slugLine = lines.findIndex((l) => l.includes(`slug: "${patch.slug}",`));
    if (slugLine < 0) {
      notFound.push(patch.slug);
      continue;
    }
    // Find end-of-tool: next line === "  },"
    let endLine = -1;
    for (let i = slugLine + 1; i < lines.length; i++) {
      if (lines[i] === "  },") {
        endLine = i;
        break;
      }
    }
    if (endLine < 0) {
      notFound.push(`${patch.slug} (no end-of-tool)`);
      continue;
    }
    // Idempotence : skip if forgeOutput already present in this tool block
    const block = lines.slice(slugLine, endLine).join("\n");
    if (block.includes("forgeOutput")) {
      skipped++;
      continue;
    }
    // Insert renderForgeOutput before the closing line.
    lines.splice(endLine, 0, renderForgeOutput(patch));
    inserted++;
  }

  if (inserted > 0) {
    writeFileSync(file, lines.join("\n"));
  }
  console.log(`[patch-glory-forgeoutput] inserted=${inserted} skipped=${skipped} not-found=${notFound.length}`);
  if (notFound.length > 0) {
    for (const n of notFound) console.log(`  ! ${n}`);
  }
}

main();
