/**
 * src/server/services/artemis/tools/sequence-hash.ts
 *
 * Phase 17 (ADR-0042) — Hash anti-drift sur prompts de sequence.
 *
 * Calcul SHA-256 (tronqué 16 chars) du concat des `promptTemplate` des
 * steps GLORY de la sequence. Whitespace + casing normalisés avant hash
 * pour éviter les false positives sur reformatting.
 *
 * Usage :
 *   - Calculé au build via `computeSequencePromptHash(seq)`
 *   - Stocké dans `GlorySequenceDef.promptHash` au moment de la promotion
 *     vers `lifecycle: "STABLE"` (Intent `PROMOTE_SEQUENCE_LIFECYCLE`)
 *   - Vérifié par `tests/unit/governance/sequence-prompt-drift.test.ts`
 *     pour toutes les sequences STABLE
 *
 * Anti-drift : toute modification d'un `promptTemplate` d'une sequence
 * STABLE → CI fail. Le contributeur doit soit (a) émettre un Intent
 * `PROMOTE_SEQUENCE_LIFECYCLE` avec nouveau hash, soit (b) revert en
 * DRAFT temporairement.
 */

import crypto from "node:crypto";
import { getGloryTool } from "./registry";
import type { GlorySequenceDef } from "./sequences";

/**
 * Normalise une chaîne pour hash stable :
 * - lowercase
 * - whitespace runs → single space
 * - trim
 *
 * Évite les false positives sur reformatting (indentation, line breaks,
 * casing variations).
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Calcule le hash anti-drift d'une sequence à partir des `promptTemplate`
 * des steps GLORY. Les autres types de step (PILLAR, CALC, ARTEMIS, etc.)
 * sont ignorés (pas de prompt template). Si la sequence n'a aucun step
 * GLORY, retourne un hash vide stable `"empty:noglory"`.
 */
export function computeSequencePromptHash(seq: GlorySequenceDef): string {
  const templates: string[] = [];
  for (const step of seq.steps) {
    if (step.type !== "GLORY") continue;
    const tool = getGloryTool(step.ref);
    if (!tool) continue;
    templates.push(normalize(tool.promptTemplate));
  }
  if (templates.length === 0) return "empty:noglory";
  const concatenated = templates.join("\n---\n");
  return crypto.createHash("sha256").update(concatenated).digest("hex").slice(0, 16);
}

/**
 * Helper : retourne true si le hash actuel match le hash stocké.
 * Pour sequences STABLE : doit être true (sinon drift = fail CI).
 * Pour sequences DRAFT : pas de check (peut bouger).
 */
export function hasPromptDrifted(seq: GlorySequenceDef): boolean {
  if (seq.lifecycle !== "STABLE") return false;
  if (!seq.promptHash) return true;
  return computeSequencePromptHash(seq) !== seq.promptHash;
}
