/**
 * Anubis — Comms handler stub Oracle-only (Phase 13, B9, ADR-0018).
 *
 * Handler minimal pour `ANUBIS_DRAFT_COMMS_PLAN` — retourne un placeholder
 * structuré pour la section dormante Oracle `anubis-comms-dormant`.
 *
 * **Cap 7 BRAINS preserved** : Anubis N'EST PAS ajouté à BRAINS const ;
 * il reste pré-réservé. Ce handler est une **sortie partielle Oracle-only**
 * documentée ADR-0018.
 *
 * APOGEE — Sous-système Comms (Ground #7). Activation Phase 8+ (broadcast,
 * paid + earned media, email/SMS/ad-networks). Cf. ADR-0011.
 */

import type {
  AnubisDraftCommsPlanPayload,
  AnubisCommsPlanPlaceholder,
} from "./types";

export async function draftCommsPlan(
  payload: AnubisDraftCommsPlanPayload,
): Promise<AnubisCommsPlanPlaceholder> {
  return {
    placeholder: payload.audience
      ? `Plan comms ${payload.audience} — pré-réservé Anubis (Phase 8+ activation pending). Cf. ADR-0011 + ADR-0018.`
      : "Plan comms — pré-réservé Anubis (Phase 8+ activation pending). Cf. ADR-0011 + ADR-0018.",
    status: "DORMANT_PRE_RESERVED",
    adrRefs: ["ADR-0011", "ADR-0018"],
    scaffoldedAt: new Date().toISOString(),
  };
}
