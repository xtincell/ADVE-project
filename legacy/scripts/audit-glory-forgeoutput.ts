/**
 * audit-glory-forgeoutput.ts — Phase 9 résidu 4.
 *
 * Parcourt les ~106 Glory tools de `registry.ts` et liste ceux qui :
 *  (a) déclarent déjà `forgeOutput`
 *  (b) devraient en déclarer un selon heuristique nom + slug + layer
 *  (c) sont brief-only (texte consommé tel quel, pas de forge)
 *
 * Output : `docs/governance/glory-forgeoutput-audit.md` (auto-généré).
 *
 * Le script ne mute PAS le registry — c'est l'opérateur (humain ou agent)
 * qui ajoute `forgeOutput` après revue, sur la base de cet audit.
 *
 * Heuristique forgeKind par mots-clés :
 *   - "Print", "Affiche", "KV", "Banana", "Visuel", "Storyboard" → image
 *   - "Pictogramme", "Iconographie", "Icône" → icon
 *   - "Spot", "Vidéo", "Reel", "Film" → video
 *   - "Audio", "Jingle", "Voix off", "Podcast" → audio
 *   - "Pitch", "Cases Awards", "Présentation", "Deck", "Memo" → design
 *   - "Brief Fournisseur", "Devis" → design (template visuel)
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  EXTENDED_GLORY_TOOLS,
  type GloryToolDef,
  type GloryToolForgeOutput,
} from "../src/server/services/artemis/tools/registry";

interface AuditEntry {
  slug: string;
  name: string;
  layer: string;
  hasForgeOutput: boolean;
  declaredKind?: GloryToolForgeOutput["forgeKind"];
  suggestedKind?: GloryToolForgeOutput["forgeKind"];
  reason: string;
}

const HEURISTICS: Array<{
  pattern: RegExp;
  kind: GloryToolForgeOutput["forgeKind"];
  reason: string;
}> = [
  { pattern: /print|affiche/i, kind: "image", reason: "print/affiche → image asset" },
  { pattern: /\bkv\b|banana|visuel|storyboard|moodboard/i, kind: "image", reason: "visuel/KV → image asset" },
  { pattern: /pictogramme|iconograph|icône|icone/i, kind: "icon", reason: "pictogramme → icon asset" },
  { pattern: /spot|vidéo|video|reel|film/i, kind: "video", reason: "spot vidéo → video asset" },
  { pattern: /audio|jingle|voix off|podcast/i, kind: "audio", reason: "audio brief → audio asset" },
  { pattern: /pitch|cases?\s+awards|présentation|deck|mémo|memo/i, kind: "design", reason: "présentation/deck → design asset" },
  { pattern: /brief\s+fournisseur|devis/i, kind: "design", reason: "document fournisseur → design asset" },
  { pattern: /benchmark|étude|analyse|audit|cohérence|optimiseur/i, kind: undefined as never, reason: "analyse → brief-only (no forge)" },
];

function suggest(tool: GloryToolDef): { kind?: GloryToolForgeOutput["forgeKind"]; reason: string } {
  const haystack = `${tool.name} ${tool.slug}`;
  for (const h of HEURISTICS) {
    if (h.pattern.test(haystack)) {
      return { kind: h.kind, reason: h.reason };
    }
  }
  return { kind: undefined, reason: "no forge keyword detected → brief-only by default" };
}

function audit(): AuditEntry[] {
  return EXTENDED_GLORY_TOOLS.map((tool) => {
    const declared = tool.forgeOutput?.forgeKind;
    if (declared) {
      return {
        slug: tool.slug,
        name: tool.name,
        layer: tool.layer,
        hasForgeOutput: true,
        declaredKind: declared,
        reason: `already declares forgeOutput.forgeKind=${declared}`,
      };
    }
    const s = suggest(tool);
    return {
      slug: tool.slug,
      name: tool.name,
      layer: tool.layer,
      hasForgeOutput: false,
      suggestedKind: s.kind,
      reason: s.reason,
    };
  });
}

function render(entries: AuditEntry[]): string {
  const declared = entries.filter((e) => e.hasForgeOutput);
  const candidates = entries.filter((e) => !e.hasForgeOutput && e.suggestedKind);
  const briefOnly = entries.filter((e) => !e.hasForgeOutput && !e.suggestedKind);

  const lines: string[] = [];
  lines.push("# Glory Tools — forgeOutput audit");
  lines.push("");
  lines.push(`Auto-généré par \`npx tsx scripts/audit-glory-forgeoutput.ts\` (NEFER Phase 9 résidu 4).`);
  lines.push("");
  lines.push(`Total tools : **${entries.length}**`);
  lines.push(`- Avec \`forgeOutput\` déclaré : **${declared.length}**`);
  lines.push(`- Candidats à instrumenter : **${candidates.length}**`);
  lines.push(`- Brief-only (no forge attendue) : **${briefOnly.length}**`);
  lines.push("");
  lines.push("## ✓ Déjà instrumentés");
  lines.push("");
  lines.push("| slug | name | forgeKind |");
  lines.push("|---|---|---|");
  for (const e of declared) {
    lines.push(`| \`${e.slug}\` | ${e.name} | \`${e.declaredKind}\` |`);
  }
  lines.push("");
  lines.push("## ⚠ Candidats à instrumenter (heuristique)");
  lines.push("");
  lines.push("| slug | name | layer | forgeKind suggéré | raison |");
  lines.push("|---|---|---|---|---|");
  for (const e of candidates) {
    lines.push(`| \`${e.slug}\` | ${e.name} | ${e.layer} | \`${e.suggestedKind}\` | ${e.reason} |`);
  }
  lines.push("");
  lines.push("## · Brief-only (pas de forge attendue)");
  lines.push("");
  lines.push(`<details><summary>${briefOnly.length} tools — clic pour développer</summary>`);
  lines.push("");
  lines.push("| slug | name | layer |");
  lines.push("|---|---|---|");
  for (const e of briefOnly) {
    lines.push(`| \`${e.slug}\` | ${e.name} | ${e.layer} |`);
  }
  lines.push("");
  lines.push("</details>");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("**Action attendue** : pour chaque candidat, l'opérateur ouvre la PR dédiée qui ajoute `forgeOutput: { forgeKind, providerHint, modelHint, manipulationProfile, briefTextPath, defaultPillarSource }` dans le tool def, après vérification que le tool produit bien un livrable matérialisable.");
  return lines.join("\n");
}

function main() {
  const entries = audit();
  const md = render(entries);
  const out = resolve(__dirname, "..", "docs/governance/glory-forgeoutput-audit.md");
  writeFileSync(out, md);
  console.log(`[audit-glory-forgeoutput] wrote ${out}`);
  console.log(`  total=${entries.length} declared=${entries.filter((e) => e.hasForgeOutput).length} candidates=${entries.filter((e) => !e.hasForgeOutput && e.suggestedKind).length} brief-only=${entries.filter((e) => !e.hasForgeOutput && !e.suggestedKind).length}`);
}

main();
